"""FastAPI backend for the multimodal RAG system — search + upload/ingest."""

import asyncio
import os
import shutil
import tempfile
import uuid
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from query import query_rag
from ingest import (
    embed_text, embed_image, embed_video,
    describe_content, insert_document,
)
from video_chunker import chunk_video

ASSETS_VIDEO = os.path.join("assets", "video")
ASSETS_IMAGES = os.path.join("assets", "images")

# Ensure asset directories exist before StaticFiles mounts them
os.makedirs(ASSETS_VIDEO, exist_ok=True)
os.makedirs(ASSETS_IMAGES, exist_ok=True)

# In-memory log store keyed by job_id
job_logs: dict[str, list[str]] = {}
job_done: dict[str, bool] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    os.makedirs(ASSETS_VIDEO, exist_ok=True)
    os.makedirs(ASSETS_IMAGES, exist_ok=True)
    yield


app = FastAPI(title="Multimodal RAG API", lifespan=lifespan)

# Static file serving for media previews
app.mount("/assets/images", StaticFiles(directory=ASSETS_IMAGES), name="images")
app.mount("/assets/video", StaticFiles(directory=ASSETS_VIDEO), name="video")


# ── Health ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Search ───────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    question: str
    top_k: int = 5
    source_type: str | None = None


@app.post("/api/search")
async def search(req: SearchRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    filter_type = None if not req.source_type or req.source_type.lower() == "all" else req.source_type.lower()
    answer, matches = query_rag(req.question, top_k=req.top_k, source_type=filter_type)

    # Inject media_url into each match
    for m in matches:
        if m["source_type"] == "image":
            path = os.path.join(ASSETS_IMAGES, m["source_file"])
            m["media_url"] = f"/assets/images/{m['source_file']}" if os.path.exists(path) else None
        elif m["source_type"] == "video":
            path = os.path.join(ASSETS_VIDEO, m["source_file"])
            m["media_url"] = f"/assets/video/{m['source_file']}" if os.path.exists(path) else None
        else:
            m["media_url"] = None

    return {"answer": answer, "matches": matches}


# ── Upload / Ingest ──────────────────────────────────────────────────

def _log(job_id: str, msg: str):
    job_logs[job_id].append(msg)


def _run_ingest(job_id: str, filepath: str, filename: str):
    """Background task: detect file type, embed, insert into Supabase."""
    ext = os.path.splitext(filename)[1].lower()

    try:
        # ── Text ────────────────────────────────────────────────
        if ext in (".md", ".txt"):
            _log(job_id, f"📄 Detected text file: {filename}")
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()
            _log(job_id, "  Embedding text...")
            vector = embed_text(text)
            insert_document(
                content=text,
                embedding=vector,
                source_type="text",
                source_file=filename,
            )
            _log(job_id, f"  ✅ Ingested ({len(vector)} dims)")

        # ── Image ───────────────────────────────────────────────
        elif ext in (".png", ".jpg", ".jpeg"):
            mime = "image/png" if ext == ".png" else "image/jpeg"
            _log(job_id, f"🖼️ Detected image: {filename}")

            os.makedirs(ASSETS_IMAGES, exist_ok=True)
            saved_path = os.path.join(ASSETS_IMAGES, filename)
            shutil.copy2(filepath, saved_path)
            _log(job_id, f"  Saved to {saved_path}")

            _log(job_id, "  Generating description...")
            description = describe_content(filepath, mime)
            _log(job_id, "  Embedding image...")
            vector = embed_image(filepath)
            insert_document(
                content=description,
                embedding=vector,
                source_type="image",
                source_file=filename,
                metadata={"description": description},
            )
            _log(job_id, f"  ✅ Ingested ({len(vector)} dims)")

        # ── Video ───────────────────────────────────────────────
        elif ext == ".mp4":
            _log(job_id, f"🎬 Detected video: {filename}")

            chunk_dir = tempfile.mkdtemp(prefix="rag_chunks_")
            _log(job_id, "  Chunking video (97s segments, 15s overlap)...")
            chunk_paths = chunk_video(filepath, output_dir=chunk_dir)
            _log(job_id, f"  Created {len(chunk_paths)} chunks")

            os.makedirs(ASSETS_VIDEO, exist_ok=True)

            for i, cpath in enumerate(chunk_paths):
                chunk_name = os.path.basename(cpath)
                _log(job_id, f"  Processing chunk {i+1}/{len(chunk_paths)}: {chunk_name}")

                _log(job_id, "    Generating description...")
                description = describe_content(cpath, "video/mp4")
                _log(job_id, "    Embedding video chunk...")
                vector = embed_video(cpath)

                insert_document(
                    content=description,
                    embedding=vector,
                    source_type="video",
                    source_file=chunk_name,
                    chunk_index=i,
                    metadata={"description": description, "chunk_index": i,
                              "source_video": filename},
                )
                _log(job_id, f"    ✅ Chunk {i+1} ingested ({len(vector)} dims)")

                shutil.copy2(cpath, os.path.join(ASSETS_VIDEO, chunk_name))

            shutil.rmtree(chunk_dir, ignore_errors=True)
            _log(job_id, f"  ✅ All {len(chunk_paths)} chunks ingested")

        else:
            _log(job_id, f"❌ Unsupported file type: {ext}")
            _log(job_id, "   Supported: .md, .txt, .png, .jpg, .jpeg, .mp4")

    except Exception as e:
        _log(job_id, f"❌ Error: {e}")
    finally:
        # Clean up the temp upload file
        try:
            os.unlink(filepath)
        except OSError:
            pass
        job_done[job_id] = True
        job_logs[job_id].append("__DONE__")


@app.post("/api/upload")
async def upload(file: UploadFile, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job_logs[job_id] = []
    job_done[job_id] = False

    # Save to a temp file so the background task can read it after the request ends
    suffix = os.path.splitext(file.filename)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    content = await file.read()
    tmp.write(content)
    tmp.close()

    background_tasks.add_task(_run_ingest, job_id, tmp.name, file.filename)
    return {"job_id": job_id}


@app.get("/api/upload/stream/{job_id}")
async def upload_stream(job_id: str):
    if job_id not in job_logs:
        raise HTTPException(status_code=404, detail="Job not found.")

    async def event_generator():
        sent = 0
        while True:
            logs = job_logs.get(job_id, [])
            while sent < len(logs):
                line = logs[sent]
                sent += 1
                yield f"data: {line}\n\n"
                if line == "__DONE__":
                    return
            if job_done.get(job_id) and sent >= len(job_logs.get(job_id, [])):
                return
            await asyncio.sleep(0.3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
