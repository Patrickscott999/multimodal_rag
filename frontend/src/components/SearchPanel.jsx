import { useState } from 'react'
import ResultCard from './ResultCard'

const SOURCE_TYPES = ['All', 'Text', 'Image', 'Video']

export default function SearchPanel() {
  const [question,   setQuestion]   = useState('')
  const [topK,       setTopK]       = useState(5)
  const [sourceType, setSourceType] = useState('All')
  const [loading,    setLoading]    = useState(false)
  const [answer,     setAnswer]     = useState('')
  const [matches,    setMatches]    = useState([])
  const [searchKey,  setSearchKey]  = useState(0)
  const [error,      setError]      = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError('')
    setAnswer('')
    setMatches([])

    try {
      const res = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          top_k:       topK,
          source_type: sourceType === 'All' ? null : sourceType.toLowerCase(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Search failed')
      }
      const data = await res.json()
      setAnswer(data.answer)
      setMatches(data.matches)
      setSearchKey(k => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Query form ── */}
      <form onSubmit={handleSearch} className="glass reveal" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question textarea */}
          <div>
            <label
              htmlFor="question"
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(34,211,238,0.7)',
                marginBottom: '8px',
              }}
            >
              Query
            </label>
            <textarea
              id="question"
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask anything about your knowledge base…"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSearch(e) }}
              style={{
                width: '100%',
                background: 'rgba(6,11,20,0.6)',
                border: '1px solid rgba(34,211,238,0.18)',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                padding: '12px 16px',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(34,211,238,0.5)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(34,211,238,0.18)')}
            />
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Top-K slider */}
            <div style={{ flex: '1 1 160px' }}>
              <label
                htmlFor="topk"
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(34,211,238,0.7)',
                  marginBottom: '8px',
                }}
              >
                Results · <span style={{ color: 'var(--aurora-cyan)' }}>{topK}</span>
              </label>
              <input
                id="topk"
                type="range"
                min={1} max={20} step={1}
                value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--aurora-cyan)' }}
              />
            </div>

            {/* Source type pills */}
            <div style={{ flex: '1 1 240px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(34,211,238,0.7)',
                  marginBottom: '8px',
                }}
              >
                Filter
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {SOURCE_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSourceType(t)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.06em',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      border: `1px solid ${sourceType === t ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.15)'}`,
                      background: sourceType === t ? 'rgba(34,211,238,0.12)' : 'transparent',
                      color: sourceType === t ? 'var(--aurora-cyan)' : 'rgba(226,232,240,0.55)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 32px',
                borderRadius: '999px',
                border: '1px solid rgba(34,211,238,0.5)',
                background: loading ? 'rgba(34,211,238,0.06)' : 'rgba(34,211,238,0.14)',
                color: loading ? 'rgba(34,211,238,0.5)' : 'var(--aurora-cyan)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Error ── */}
      {error && (
        <div
          className="glass"
          style={{ padding: '16px 20px', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          Error: {error}
        </div>
      )}

      {/* ── Answer ── */}
      {answer && (
        <div className="glass reveal" style={{ padding: '28px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(34,211,238,0.7)',
              marginBottom: '12px',
            }}
          >
            Answer
          </div>
          <p style={{ lineHeight: 1.75, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{answer}</p>
        </div>
      )}

      {/* ── Results grid ── */}
      {matches.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(34,211,238,0.7)',
              marginBottom: '16px',
            }}
          >
            Sources · {matches.length}
          </div>
          <div
            key={searchKey}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}
          >
            {matches.map((m, i) => (
              <ResultCard key={`${m.id ?? i}-${searchKey}`} match={m} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
