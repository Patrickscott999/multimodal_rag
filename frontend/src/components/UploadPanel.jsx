import { useRef, useState } from 'react'

const ACCEPTED = ['.md', '.txt', '.png', '.jpg', '.jpeg', '.mp4']

function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

function lineColor(line) {
  if (line === '__DONE__')         return 'var(--cyber-cyan)'
  if (line.includes('✅'))         return '#6ee7b7'
  if (line.includes('❌'))         return '#fca5a5'
  if (line.includes('Error'))      return '#fca5a5'
  return 'rgba(226,232,240,0.65)'
}

function sanitizeLine(line) {
  return line.replace(/✅/g, '[OK]').replace(/❌/g, '[ERR]')
}

export default function UploadPanel() {
  const [file,      setFile]      = useState(null)
  const [dragging,  setDragging]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [logs,      setLogs]      = useState([])
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')
  const fileInputRef = useRef(null)
  const logsEndRef   = useRef(null)

  function pickFile(f) {
    if (!f) return
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported type: ${ext}. Accepted: ${ACCEPTED.join(', ')}`)
      return
    }
    setError('')
    setFile(f)
    setLogs([])
    setDone(false)
  }

  // ── Drag handlers ──
  function onDragOver(e) { e.preventDefault(); setDragging(true) }
  function onDragLeave()  { setDragging(false) }
  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }
  function onInputChange(e) { pickFile(e.target.files[0]) }

  // ── Ingest ──
  async function handleIngest() {
    if (!file || loading) return

    setLoading(true)
    setLogs([])
    setDone(false)
    setError('')

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Upload failed')
      }
      const { job_id } = await res.json()

      // Open SSE stream
      const es = new EventSource(`/api/upload/stream/${job_id}`)

      es.onmessage = (ev) => {
        const line = ev.data
        setLogs(prev => {
          const next = [...prev, line]
          // Auto-scroll after state update
          setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
          return next
        })
        if (line === '__DONE__') {
          es.close()
          setDone(true)
          setLoading(false)
        }
      }

      es.onerror = () => {
        es.close()
        setError('Stream connection lost.')
        setLoading(false)
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const dropBorderColor = dragging
    ? 'rgba(0,229,255,0.6)'
    : file
      ? 'rgba(0,229,255,0.3)'
      : 'rgba(0,229,255,0.15)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Drop zone ── */}
      <div
        className="glass reveal"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        style={{
          padding: '48px 32px',
          textAlign: 'center',
          borderColor: dropBorderColor,
          background: dragging ? 'rgba(0,229,255,0.07)' : 'var(--glass-bg)',
          cursor: file ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={onInputChange}
          style={{ display: 'none' }}
        />

        {file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--cyber-cyan)', letterSpacing: '0.04em' }}>
              {file.name.endsWith('.mp4') ? 'VID' : file.name.match(/\.(png|jpg|jpeg)$/) ? 'IMG' : 'TXT'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyber-cyan)' }}>
              {file.name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(226,232,240,0.5)' }}>
              {formatBytes(file.size)}
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); setLogs([]); setDone(false) }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'rgba(239,68,68,0.7)',
                letterSpacing: '0.06em',
                marginTop: '4px',
              }}
            >
              remove
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ opacity: 0.5 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <div style={{ color: 'rgba(226,232,240,0.7)', fontSize: '0.95rem' }}>
              {dragging ? 'Drop it!' : 'Drop a file or click to browse'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'rgba(0,229,255,0.5)',
                letterSpacing: '0.06em',
              }}
            >
              {ACCEPTED.join('  ·  ')}
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="glass"
          style={{ padding: '14px 20px', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}
        >
          Error: {error}
        </div>
      )}

      {/* ── Ingest button ── */}
      {file && !done && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleIngest}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '12px 40px',
              borderRadius: '999px',
              border: '1px solid rgba(0,229,255,0.42)',
              background: loading ? 'rgba(0,229,255,0.06)' : 'rgba(0,229,255,0.1)',
              color: loading ? 'rgba(0,229,255,0.5)' : 'var(--cyber-cyan)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 18px rgba(0,229,255,0.14)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Ingesting…' : 'Ingest'}
          </button>
        </div>
      )}

      {/* ── SSE log ── */}
      {logs.length > 0 && (
        <div
          className="glass reveal"
          style={{ padding: '20px 24px' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(0,229,255,0.7)',
              marginBottom: '12px',
            }}
          >
            Ingestion log
          </div>
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {logs.filter(l => l !== '__DONE__').map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  color: lineColor(line),
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {sanitizeLine(line)}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {done && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(0,229,255,0.12)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--cyber-cyan)',
                textAlign: 'center',
              }}
            >
              Ingestion complete — file is now searchable
            </div>
          )}
        </div>
      )}
    </div>
  )
}
