import { useState } from 'react'
import MediaPreview from './MediaPreview'

const TYPE_COLORS = {
  text:  { bg: 'rgba(0,229,255,0.07)',  border: 'rgba(0,229,255,0.28)',  color: '#00e5ff' },
  image: { bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.28)', color: '#4ade80' },
  video: { bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.28)', color: '#a78bfa' },
}

const TYPE_ICONS = { text: 'TXT', image: 'IMG', video: 'VID' }

export default function ResultCard({ match, index }) {
  const [expanded, setExpanded] = useState(false)

  const pct = Math.round(match.similarity * 100)
  const tc  = TYPE_COLORS[match.source_type] ?? TYPE_COLORS.text

  return (
    <div
      className="glass reveal"
      style={{
        padding: '18px',
        animationDelay: `${index * 80}ms`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* ── Top row: badges ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.6rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '2px 9px',
          borderRadius: '999px',
          background: tc.bg,
          border: `1px solid ${tc.border}`,
          color: tc.color,
        }}>
          {TYPE_ICONS[match.source_type]} {match.source_type}
        </span>

        <span style={{
          marginLeft: 'auto',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          color: pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : 'rgba(255,255,255,0.35)',
        }}>
          {pct}%
        </span>
      </div>

      {/* ── Similarity bar ── */}
      <div style={{ height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%',
          borderRadius: '1px',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--aurora-teal), var(--cyber-cyan))',
          transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      {/* ── File name ── */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        color: 'rgba(0,229,255,0.55)',
        wordBreak: 'break-all',
      }}>
        {match.source_file}
        {match.chunk_index != null && (
          <span style={{ opacity: 0.5 }}> / chunk {match.chunk_index}</span>
        )}
      </div>

      {/* ── Content preview ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '0.83rem',
          lineHeight: 1.65,
          color: 'rgba(210,210,230,0.72)',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: expanded ? 'unset' : 3,
          overflow: 'hidden',
        }}
        title={expanded ? 'Click to collapse' : 'Click to expand'}
      >
        {match.content}
      </button>

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          color: 'rgba(0,229,255,0.4)',
          letterSpacing: '0.08em',
        }}
      >
        {expanded ? '- collapse' : '+ expand'}
      </button>

      {/* ── Media preview (only when expanded) ── */}
      {expanded && (
        <MediaPreview sourceType={match.source_type} mediaUrl={match.media_url} />
      )}
    </div>
  )
}
