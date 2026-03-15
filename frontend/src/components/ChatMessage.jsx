import { useRef } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import ResultCard from './ResultCard'

/* Backend SSE lines may contain these unicode chars — detect for colour,
   sanitize before rendering so no emoji reaches the DOM.              */
function lineColor(line) {
  if (line.includes('✅'))    return '#4ade80'
  if (line.includes('❌'))    return '#f87171'
  if (line.includes('Error')) return '#f87171'
  return 'rgba(220, 220, 240, 0.55)'
}

function sanitizeLine(line) {
  return line.replace(/✅/g, '[OK]').replace(/❌/g, '[ERR]')
}

const entry = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
}

/* ── Shared sub-components ─────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <polyline points="1.5 6.5 5 10 11.5 3"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      style={{ flexShrink: 0 }}>
      <line x1="2" y1="2" x2="11" y2="11"/>
      <line x1="11" y1="2" x2="2" y2="11"/>
    </svg>
  )
}

/* ── RAG avatar badge ──────────────────────────────────────────── */
function Avatar({ label, gradient }) {
  return (
    <div style={{
      width: 30, height: 30,
      borderRadius: '50%',
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: '0.58rem',
      fontWeight: 700,
      color: '#04040a',
      letterSpacing: '0.04em',
      marginTop: 3,
    }}>
      {label}
    </div>
  )
}

/* ── User bubble ───────────────────────────────────────────────── */
function UserMessage({ content }) {
  return (
    <motion.div variants={entry} initial="initial" animate="animate"
      style={{ display: 'flex', justifyContent: 'flex-end', padding: '3px 0' }}
    >
      <div style={{
        maxWidth: '70%',
        padding: '11px 17px',
        borderRadius: '18px 18px 3px 18px',
        background: 'rgba(0, 229, 255, 0.07)',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        color: 'rgba(228, 228, 244, 0.9)',
        fontSize: '0.93rem',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        backdropFilter: 'blur(12px)',
      }}>
        {content}
      </div>
    </motion.div>
  )
}

/* ── Answer (AI) message ───────────────────────────────────────── */
function AnswerMessage({ content, matches }) {
  return (
    <motion.div variants={entry} initial="initial" animate="animate"
      style={{ display: 'flex', gap: 12, padding: '3px 0', alignItems: 'flex-start' }}
    >
      <Avatar label="RAG" gradient="linear-gradient(135deg, #0d9488, #00e5ff)" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Answer text */}
        <div className="rag-answer" style={{
          padding: '13px 17px',
          borderRadius: '3px 18px 18px 18px',
          background: 'rgba(4, 4, 10, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(16px)',
        }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Result cards */}
        {matches && matches.length > 0 && (
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(0, 229, 255, 0.45)',
              marginBottom: 10,
            }}>
              Sources / {matches.length}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 10,
            }}>
              {matches.map((m, i) => (
                <ResultCard key={m.id ?? i} match={m} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Ingest log message ────────────────────────────────────────── */
function IngestMessage({ filename, logs, done }) {
  const logsEndRef = useRef(null)

  return (
    <motion.div variants={entry} initial="initial" animate="animate"
      style={{ display: 'flex', gap: 12, padding: '3px 0', alignItems: 'flex-start' }}
    >
      <Avatar label="IN" gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />

      <div style={{ flex: 1 }}>
        <div style={{
          padding: '14px 18px',
          borderRadius: '3px 16px 16px 16px',
          background: 'rgba(4, 4, 10, 0.78)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(139, 92, 246, 0.7)',
            marginBottom: 10,
          }}>
            Ingesting / {filename}
          </div>

          {logs.length > 0 && (
            <div style={{
              maxHeight: 260,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}>
              {logs.filter(l => l !== '__DONE__').map((line, i) => (
                <div key={i} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  lineHeight: 1.55,
                  color: lineColor(line),
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {sanitizeLine(line)}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}

          {done && (
            <div style={{
              marginTop: logs.length > 0 ? 12 : 0,
              paddingTop: logs.length > 0 ? 10 : 0,
              borderTop: logs.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--cyber-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}>
              <CheckIcon /> Ingestion complete — file is now searchable
            </div>
          )}

          {!done && logs.length === 0 && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.28)',
            }}>
              Starting...
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Error message ─────────────────────────────────────────────── */
function ErrorMessage({ content }) {
  return (
    <motion.div variants={entry} initial="initial" animate="animate"
      style={{ display: 'flex', gap: 12, padding: '3px 0', alignItems: 'flex-start' }}
    >
      <div style={{ width: 30, flexShrink: 0 }} />
      <div style={{
        flex: 1,
        padding: '11px 16px',
        borderRadius: 10,
        background: 'rgba(239, 68, 68, 0.07)',
        border: '1px solid rgba(239, 68, 68, 0.22)',
        color: '#f87171',
        fontSize: '0.88rem',
        lineHeight: 1.6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        backdropFilter: 'blur(12px)',
      }}>
        <XIcon />
        <span>{content}</span>
      </div>
    </motion.div>
  )
}

/* ── Thinking indicator ────────────────────────────────────────── */
export function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', gap: 12, padding: '3px 0', alignItems: 'flex-start' }}
    >
      <Avatar label="RAG" gradient="linear-gradient(135deg, #0d9488, #00e5ff)" />
      <div style={{
        padding: '13px 17px',
        borderRadius: '3px 18px 18px 18px',
        background: 'rgba(4, 4, 10, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backdropFilter: 'blur(16px)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(0,229,255,0.5)', letterSpacing: '0.06em' }}>
          Thinking
        </span>
        <TypingDots />
      </div>
    </motion.div>
  )
}

function TypingDots() {
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          style={{
            width: 3, height: 3,
            borderRadius: '50%',
            background: 'var(--cyber-cyan)',
            display: 'inline-block',
          }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

/* ── Main export ───────────────────────────────────────────────── */
export default function ChatMessage({ type, content, matches, filename, logs, done }) {
  if (type === 'user')   return <UserMessage content={content} />
  if (type === 'answer') return <AnswerMessage content={content} matches={matches} />
  if (type === 'ingest') return <IngestMessage filename={filename} logs={logs} done={done} />
  if (type === 'error')  return <ErrorMessage content={content} />
  return null
}
