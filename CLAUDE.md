# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Gradio web UI (opens at http://localhost:7860)
python app.py

# Ingest all files in assets/ directories via CLI
python ingest.py

# Ingest a single video by chunking it first
python video_chunker.py <video_file>

# Query via CLI
python query.py "your question here"

# Verify Gemini Embedding 2 works for all modalities
python canary_test.py

# Apply database migration (first-time setup)
supabase init
mkdir -p supabase/migrations
cp migration.sql supabase/migrations/20250101000000_init.sql
supabase link --project-ref <project-ref>
supabase db push
```

Prerequisites: Python 3.10+, ffmpeg, Supabase CLI (`brew install supabase/tap/supabase` on macOS).

## Architecture

This is a multimodal RAG system that embeds text, images, and video into a single vector space using Google's Gemini Embedding 2 model, stores them in Supabase (pgvector), and exposes a Gradio UI.

**Two models, two jobs:**
- `gemini-embedding-2-preview` — turns any content (text, image, video) into 1,536-dimension vectors for similarity search
- `gemini-3.1-flash-lite-preview` — generates text descriptions of images/video (for the `content` column) and synthesizes answers from retrieved context

**Why 1,536 dims:** pgvector HNSW index has a 2,000-dim limit. Gemini Embedding 2 supports MRL so truncating from its native dimensionality has minimal quality loss.

**Database schema** (`migration.sql`): Single `documents` table with `embedding VECTOR(1536)`, `content TEXT`, `source_type` (text/image/video), `source_file`, `chunk_index`, and `metadata JSONB`. Search goes through the `match_documents` RPC function (cosine similarity via HNSW index).

**Critical distinction — embedding vs content column:**
- `embedding` = native vector from the RAW media (what enables search)
- `content` = LLM-generated text description for images/video, raw text for documents (what enables LLM answers)

For each image/video, two separate API calls are made: one to the embedding model (for the vector) and one to the LLM (for the description). Without the description, media matches would be found but the LLM couldn't reference them in answers.

**Video chunking** (`video_chunker.py`): Gemini Embedding 2 accepts max 128s of video per request. Videos are split into 97s segments with 15s overlap to prevent context loss at cut points.

**File flow:**
- `config.py` — all constants and env vars
- `ingest.py` — embedding helpers + per-modality ingestion pipelines (called by `app.py` for uploads and standalone for bulk ingestion)
- `query.py` — embeds query with `RETRIEVAL_QUERY` task type, calls `match_documents` RPC, builds context, generates answer
- `app.py` — Gradio UI with Search tab and Upload & Ingest tab; uploaded images saved to `assets/images/`, video chunks to `assets/video/` for later preview
- `canary_test.py` — smoke tests all three modalities + cross-modal similarity check

**Assets directory** (not committed to git): `assets/docs/*.md|txt`, `assets/images/*.png|jpg`, `assets/video/chunk_*.mp4`
