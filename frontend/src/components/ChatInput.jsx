import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CHIPS = [
  { cmd: '/image', abbr: 'IMG', label: 'Image',  filter: 'image', color: '#00e5ff', desc: 'Filter to images', delay: 0    },
  { cmd: '/video', abbr: 'VID', label: 'Video',  filter: 'video', color: '#8b5cf6', desc: 'Filter to video',  delay: 0.55 },
  { cmd: '/text',  abbr: 'TXT', label: 'Text',   filter: 'text',  color: '#00e5ff', desc: 'Filter to docs',  delay: 1.1  },
  { cmd: '/file',  abbr: 'UP',  label: 'Upload', filter: null,    color: '#8b5cf6', desc: 'Ingest a file',   delay: 1.65 },
]

const ACCEPTED = '.md,.txt,.png,.jpg,.jpeg,.mp4'

function useAutoResizeTextarea(ref) {
  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(Math.max(el.scrollHeight, 44), 180) + 'px'
  }, [ref])
  return resize
}

export default function ChatInput({ onSend, onFileSelect, disabled }) {
  const [value,        setValue]        = useState('')
  const [focused,      setFocused]      = useState(false)
  const [showPalette,  setShowPalette]  = useState(false)
  const [paletteIdx,   setPaletteIdx]   = useState(0)
  const [activeFilter, setActiveFilter] = useState(null)

  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)
  const resize = useAutoResizeTextarea(textareaRef)

  useEffect(() => {
    if (value.startsWith('/')) { setShowPalette(true); setPaletteIdx(0) }
    else                        setShowPalette(false)
  }, [value])

  const filteredCommands = CHIPS.filter(c =>
    c.cmd.startsWith(value.split(' ')[0].toLowerCase())
  )

  function applyCommand(chip) {
    if (chip.filter === null) {
      setValue(''); setShowPalette(false); fileInputRef.current?.click()
    } else {
      setActiveFilter(chip.filter); setValue(''); setShowPalette(false)
    }
  }

  function handleKeyDown(e) {
    if (showPalette && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setPaletteIdx(i => (i + 1) % filteredCommands.length) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setPaletteIdx(i => (i - 1 + filteredCommands.length) % filteredCommands.length) }
      if (e.key === 'Tab' || (e.key === 'Enter' && showPalette)) { e.preventDefault(); applyCommand(filteredCommands[paletteIdx]); return }
      if (e.key === 'Escape')     { setShowPalette(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey && !showPalette) { e.preventDefault(); send() }
  }

  function send() {
    const q = value.trim()
    if (!q || disabled) return
    onSend(q, activeFilter)
    setValue(''); setActiveFilter(null); setTimeout(resize, 0)
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    e.target.value = ''
  }

  const hasValue = value.trim().length > 0

  return (
    <div className="chat-input-wrapper">
      <div style={{ position: 'relative' }}>

        {/* ── Active filter chip ── */}
        <AnimatePresence>
          {activeFilter && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', marginBottom: 10 }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                padding: '4px 10px 4px 9px',
                borderRadius: 999,
                background: 'rgba(0,229,255,0.07)',
                border: '1px solid rgba(0,229,255,0.28)',
                color: 'var(--cyber-cyan)',
              }}>
                <span style={{ opacity: 0.55 }}>filter</span>
                <span style={{ opacity: 0.35 }}>/</span>
                {activeFilter}
                <button
                  onClick={() => setActiveFilter(null)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 1, opacity: 0.6 }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/>
                  </svg>
                </button>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Slash command palette ── */}
        <AnimatePresence>
          {showPalette && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 14px)',
                left: 0, right: 0,
                background: 'rgba(3, 3, 8, 0.97)',
                backdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18,
                overflow: 'hidden',
                zIndex: 10,
                boxShadow: '0 -20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.06)',
              }}
            >
              {filteredCommands.map((c, i) => (
                <button
                  key={c.cmd}
                  onMouseDown={e => { e.preventDefault(); applyCommand(c) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%',
                    padding: '11px 20px',
                    background: i === paletteIdx ? 'rgba(0,229,255,0.05)' : 'transparent',
                    border: 'none',
                    borderBottom: i < filteredCommands.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    letterSpacing: '0.14em', color: c.color, opacity: 0.85,
                  }}>
                    {c.abbr}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyber-cyan)' }}>
                    {c.cmd}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)' }}>
                    {c.desc}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cyber pill ── */}
        <div className={`cyber-pill${focused ? ' cyber-pill--active' : ''}`}>

          {/* Paperclip */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="pill-attach"
            title="Upload file"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { setValue(e.target.value); resize() }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            placeholder={
              activeFilter
                ? `Search ${activeFilter}s...`
                : 'Query the knowledge base... or type / for commands'
            }
            rows={1}
            className="pill-textarea"
          />

          {/* Send button */}
          <motion.button
            type="button"
            onClick={send}
            disabled={!hasValue || disabled}
            whileTap={hasValue && !disabled ? { scale: 0.86 } : {}}
            className={`pill-send${hasValue && !disabled ? ' pill-send--active' : ''}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </motion.button>
        </div>

        {/* ── Tag chips ── */}
        <div className="chips-row">
          {CHIPS.map(chip => {
            const isActive = activeFilter === chip.filter && chip.filter !== null
            return (
              <motion.button
                key={chip.cmd}
                type="button"
                onClick={() => {
                  if (chip.filter === null) fileInputRef.current?.click()
                  else setActiveFilter(activeFilter === chip.filter ? null : chip.filter)
                }}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.92 }}
                className="cyber-chip"
                style={{
                  borderColor:  isActive ? chip.color + '50' : undefined,
                  background:   isActive ? chip.color + '12' : undefined,
                  color:        isActive ? chip.color         : undefined,
                  boxShadow:    isActive ? `0 0 14px ${chip.color}18` : undefined,
                }}
              >
                {/* Pulsing dot */}
                <motion.span
                  className="chip-dot"
                  animate={
                    isActive
                      ? { scale: [1, 2.2, 1], opacity: [0.9, 1, 0.9] }
                      : { scale: [1, 1.6, 1], opacity: [0.35, 0.65, 0.35] }
                  }
                  transition={{
                    duration: isActive ? 1.4 : 2.2,
                    repeat: Infinity,
                    delay: chip.delay,
                    ease: 'easeInOut',
                  }}
                  style={{ background: isActive ? chip.color : 'rgba(255,255,255,0.3)' }}
                />
                {chip.abbr}
              </motion.button>
            )
          })}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}
