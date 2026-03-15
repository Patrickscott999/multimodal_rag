import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import ChatInput from './ChatInput'
import ChatMessage, { ThinkingIndicator } from './ChatMessage'

export default function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Search ──────────────────────────────────────────────────────────────
  async function handleSend(question, filter) {
    setMessages(prev => [...prev, { type: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          top_k: 5,
          source_type: filter ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Search failed')
      }
      const data = await res.json()
      setMessages(prev => [...prev, {
        type: 'answer',
        content: data.answer,
        matches: data.matches,
      }])
    } catch (err) {
      setMessages(prev => [...prev, { type: 'error', content: err.message }])
    } finally {
      setLoading(false)
    }
  }

  // ── Ingest ──────────────────────────────────────────────────────────────
  async function handleFileSelect(file) {
    // Validate extension
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const ACCEPTED = ['.md', '.txt', '.png', '.jpg', '.jpeg', '.mp4']
    if (!ACCEPTED.includes(ext)) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Unsupported file type: ${ext}. Accepted: ${ACCEPTED.join(', ')}`,
      }])
      return
    }

    // Add ingest message placeholder
    setMessages(prev => [...prev, { type: 'ingest', filename: file.name, logs: [], done: false }])

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Upload failed')
      }
      const { job_id } = await res.json()

      // SSE stream
      const es = new EventSource(`/api/upload/stream/${job_id}`)

      es.onmessage = (ev) => {
        const line = ev.data
        setMessages(prev => {
          const next = [...prev]
          // Find last ingest message for this file
          let idx = -1
          for (let j = next.length - 1; j >= 0; j--) {
            if (next[j].type === 'ingest' && next[j].filename === file.name) { idx = j; break }
          }
          if (idx === -1) return next
          const updated = { ...next[idx] }
          updated.logs = [...updated.logs, line]
          if (line === '__DONE__') {
            updated.done = true
            es.close()
          }
          next[idx] = updated
          return next
        })
      }

      es.onerror = () => {
        es.close()
        setMessages(prev => [...prev, { type: 'error', content: 'Stream connection lost.' }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { type: 'error', content: err.message }])
    }
  }

  return (
    <div className="chat-interface">
      {/* Scrollable messages */}
      <div className="messages-area">
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            paddingBottom: 48,
          }}>
            {/* Decorative crosshair / scanner */}
            <div style={{ position: 'relative', width: 48, height: 48, opacity: 0.35 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--cyber-cyan)" strokeWidth="1">
                <circle cx="24" cy="24" r="16" strokeDasharray="4 3"/>
                <circle cx="24" cy="24" r="6"/>
                <line x1="24" y1="2"  x2="24" y2="14"/>
                <line x1="24" y1="34" x2="24" y2="46"/>
                <line x1="2"  y1="24" x2="14" y2="24"/>
                <line x1="34" y1="24" x2="46" y2="24"/>
              </svg>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.18)',
              textAlign: 'center',
            }}>
              Awaiting query
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} {...msg} />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {loading && <ThinkingIndicator />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky input */}
      <ChatInput
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        disabled={loading}
      />
    </div>
  )
}
