import { useRef, useEffect, useState, createElement, useMemo, useCallback, memo } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function transformValue(input, inputRange, outputRange, clamp = false) {
  const [inputMin, inputMax] = inputRange
  const [outputMin, outputMax] = outputRange
  const progress = (input - inputMin) / (inputMax - inputMin)
  let result = outputMin + progress * (outputMax - outputMin)
  if (clamp) {
    if (outputMax > outputMin) result = Math.min(Math.max(result, outputMin), outputMax)
    else result = Math.min(Math.max(result, outputMax), outputMin)
  }
  return result
}

function calculateVaporizeSpread(fontSize) {
  const size = typeof fontSize === 'string' ? parseInt(fontSize) : fontSize
  const points = [{ size: 20, spread: 0.2 }, { size: 50, spread: 0.5 }, { size: 100, spread: 1.5 }]
  if (size <= points[0].size) return points[0].spread
  if (size >= points[points.length - 1].size) return points[points.length - 1].spread
  let i = 0
  while (i < points.length - 1 && points[i + 1].size < size) i++
  const p1 = points[i], p2 = points[i + 1]
  return p1.spread + (size - p1.size) * (p2.spread - p1.spread) / (p2.size - p1.size)
}

function parseColor(color) {
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  const rgbMatch  = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbaMatch) return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${rgbaMatch[4]})`
  if (rgbMatch)  return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 1)`
  return 'rgba(0, 0, 0, 1)'
}

function useIsInView(ref) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0, rootMargin: '50px' })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return inView
}

// ── Particle system ───────────────────────────────────────────────────────────

function createParticles(ctx, canvas, text, textX, textY, font, color, alignment) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color
  ctx.font = font
  ctx.textAlign = alignment
  ctx.textBaseline = 'middle'
  ctx.imageSmoothingQuality = 'high'
  ctx.imageSmoothingEnabled = true

  const metrics  = ctx.measureText(text)
  const textWidth = metrics.width
  let textLeft
  if (alignment === 'center')     textLeft = textX - textWidth / 2
  else if (alignment === 'left')  textLeft = textX
  else                            textLeft = textX - textWidth
  const textBoundaries = { left: textLeft, right: textLeft + textWidth, width: textWidth }

  ctx.fillText(text, textX, textY)

  const imageData  = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data       = imageData.data
  const currentDPR = canvas.width / parseInt(canvas.style.width)
  const sampleRate = Math.max(1, Math.round(currentDPR / 3))

  const particles = []
  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const index = (y * canvas.width + x) * 4
      const alpha = data[index + 3]
      if (alpha > 0) {
        const originalAlpha = (alpha / 255) * (sampleRate / currentDPR)
        particles.push({
          x, y, originalX: x, originalY: y,
          color: `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${originalAlpha})`,
          opacity: originalAlpha,
          originalAlpha,
          velocityX: 0, velocityY: 0, angle: 0, speed: 0,
        })
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  return { particles, textBoundaries }
}

function updateParticles(particles, vaporizeX, deltaTime, SPREAD, DURATION, direction, density) {
  let allVaporized = true
  particles.forEach(p => {
    const shouldVaporize = direction === 'left-to-right' ? p.originalX <= vaporizeX : p.originalX >= vaporizeX
    if (shouldVaporize) {
      if (p.speed === 0) {
        p.angle = Math.random() * Math.PI * 2
        p.speed = (Math.random() * 1 + 0.5) * SPREAD
        p.velocityX = Math.cos(p.angle) * p.speed
        p.velocityY = Math.sin(p.angle) * p.speed
        p.shouldFadeQuickly = Math.random() > density
      }
      if (p.shouldFadeQuickly) {
        p.opacity = Math.max(0, p.opacity - deltaTime)
      } else {
        const dx = p.originalX - p.x, dy = p.originalY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const damp = Math.max(0.95, 1 - dist / (100 * SPREAD))
        const rnd  = SPREAD * 3
        p.velocityX = (p.velocityX + (Math.random() - 0.5) * rnd + dx * 0.002) * damp
        p.velocityY = (p.velocityY + (Math.random() - 0.5) * rnd + dy * 0.002) * damp
        const maxV = SPREAD * 2, curV = Math.sqrt(p.velocityX ** 2 + p.velocityY ** 2)
        if (curV > maxV) { p.velocityX *= maxV / curV; p.velocityY *= maxV / curV }
        p.x += p.velocityX * deltaTime * 20
        p.y += p.velocityY * deltaTime * 10
        p.opacity = Math.max(0, p.opacity - deltaTime * 0.25 * (2000 / DURATION))
      }
      if (p.opacity > 0.01) allVaporized = false
    } else {
      allVaporized = false
    }
  })
  return allVaporized
}

function renderParticles(ctx, particles, dpr) {
  ctx.save()
  ctx.scale(dpr, dpr)
  particles.forEach(p => {
    if (p.opacity > 0) {
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity})`)
      ctx.fillRect(p.x / dpr, p.y / dpr, 1, 1)
    }
  })
  ctx.restore()
}

function resetParticles(particles) {
  particles.forEach(p => {
    p.x = p.originalX; p.y = p.originalY
    p.opacity = p.originalAlpha
    p.speed = 0; p.velocityX = 0; p.velocityY = 0
  })
}

function renderCanvas({ texts, font, color, alignment, canvasRef, wrapperSize, particlesRef, globalDpr, currentTextIndex, transformedDensity }) {
  const canvas = canvasRef.current
  if (!canvas || !wrapperSize.width || !wrapperSize.height) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = wrapperSize
  canvas.style.width  = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width  = Math.floor(width  * globalDpr)
  canvas.height = Math.floor(height * globalDpr)

  const fontSize = parseInt((font.fontSize || '50px').replace('px', ''))
  const fontStr  = `${font.fontWeight ?? 400} ${fontSize * globalDpr}px ${font.fontFamily ?? 'sans-serif'}`
  const colorStr = parseColor(color ?? 'rgb(255,255,255)')

  let textX
  const textY = canvas.height / 2
  const currentText = texts[currentTextIndex] || texts[0]
  if (alignment === 'center') textX = canvas.width / 2
  else if (alignment === 'left') textX = 0
  else textX = canvas.width

  const { particles, textBoundaries } = createParticles(ctx, canvas, currentText, textX, textY, fontStr, colorStr, alignment)
  particlesRef.current = particles
  canvas.textBoundaries = textBoundaries
}

// ── SeoElement ────────────────────────────────────────────────────────────────

const SeoElement = memo(({ texts }) => {
  const style = { position: 'absolute', width: 0, height: 0, overflow: 'hidden', userSelect: 'none', pointerEvents: 'none' }
  return createElement('span', { style }, texts?.join(' ') ?? '')
})

// ── Main component ────────────────────────────────────────────────────────────

export default function VaporizeText({
  texts      = ['Text'],
  font       = { fontFamily: 'sans-serif', fontSize: '50px', fontWeight: 400 },
  color      = 'rgb(255, 255, 255)',
  spread     = 5,
  density    = 5,
  animation  = { vaporizeDuration: 2, fadeInDuration: 1, waitDuration: 0.5 },
  direction  = 'left-to-right',
  alignment  = 'center',
}) {
  const canvasRef      = useRef(null)
  const wrapperRef     = useRef(null)
  const isInView       = useIsInView(wrapperRef)
  const particlesRef   = useRef([])
  const animFrameRef   = useRef(null)
  const [currentIdx,   setCurrentIdx]   = useState(0)
  const [animState,    setAnimState]    = useState('static')
  const vaporizeProgressRef = useRef(0)
  const fadeOpacityRef      = useRef(0)
  const [wrapperSize,  setWrapperSize]  = useState({ width: 0, height: 0 })

  const globalDpr = useMemo(() => typeof window !== 'undefined' ? window.devicePixelRatio * 1.5 || 1 : 1, [])
  const transformedDensity = useMemo(() => transformValue(density, [0, 10], [0.3, 1], true), [density])

  const durations = useMemo(() => ({
    VAPORIZE: (animation.vaporizeDuration  ?? 2)   * 1000,
    FADE_IN:  (animation.fadeInDuration    ?? 1)   * 1000,
    WAIT:     (animation.waitDuration      ?? 0.5) * 1000,
  }), [animation.vaporizeDuration, animation.fadeInDuration, animation.waitDuration])

  const fontConfig = useMemo(() => {
    const fontSize = parseInt((font.fontSize || '50px').replace('px', ''))
    const SPREAD   = calculateVaporizeSpread(fontSize) * spread
    return { fontSize, SPREAD }
  }, [font.fontSize, spread])

  // Start / stop on visibility
  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => setAnimState('vaporizing'), 0)
      return () => clearTimeout(t)
    } else {
      setAnimState('static')
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    }
  }, [isInView])

  // Animation loop
  useEffect(() => {
    if (!isInView) return
    let lastTime = performance.now()
    let frameId

    const animate = (now) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      const canvas = canvasRef.current
      const ctx    = canvas?.getContext('2d')
      if (!canvas || !ctx || !particlesRef.current.length) { frameId = requestAnimationFrame(animate); return }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (animState === 'static' || animState === 'waiting') {
        renderParticles(ctx, particlesRef.current, globalDpr)

      } else if (animState === 'vaporizing') {
        vaporizeProgressRef.current += dt * 100 / (durations.VAPORIZE / 1000)
        const bounds = canvas.textBoundaries
        if (bounds) {
          const pct = Math.min(100, vaporizeProgressRef.current)
          const vX  = direction === 'left-to-right'
            ? bounds.left + bounds.width * pct / 100
            : bounds.right - bounds.width * pct / 100
          const done = updateParticles(particlesRef.current, vX, dt, fontConfig.SPREAD, durations.VAPORIZE, direction, transformedDensity)
          renderParticles(ctx, particlesRef.current, globalDpr)
          if (vaporizeProgressRef.current >= 100 && done) {
            setCurrentIdx(i => (i + 1) % texts.length)
            setAnimState('fadingIn')
            fadeOpacityRef.current = 0
          }
        }

      } else if (animState === 'fadingIn') {
        fadeOpacityRef.current += dt * 1000 / durations.FADE_IN
        ctx.save(); ctx.scale(globalDpr, globalDpr)
        particlesRef.current.forEach(p => {
          p.x = p.originalX; p.y = p.originalY
          const op = Math.min(fadeOpacityRef.current, 1) * p.originalAlpha
          ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${op})`)
          ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1, 1)
        })
        ctx.restore()
        if (fadeOpacityRef.current >= 1) {
          setAnimState('waiting')
          setTimeout(() => {
            setAnimState('vaporizing')
            vaporizeProgressRef.current = 0
            resetParticles(particlesRef.current)
          }, durations.WAIT)
        }
      }

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [animState, isInView, texts.length, direction, globalDpr, fontConfig.SPREAD, durations, transformedDensity])

  // Re-render canvas when text / size changes
  useEffect(() => {
    renderCanvas({ texts, font, color, alignment, canvasRef, wrapperSize, particlesRef, globalDpr, currentTextIndex: currentIdx, transformedDensity })
  }, [texts, font, color, alignment, wrapperSize, currentIdx, globalDpr, transformedDensity])

  // Observe wrapper resize
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        setWrapperSize({ width, height })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Initial size
  useEffect(() => {
    if (wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect()
      setWrapperSize({ width: r.width, height: r.height })
    }
  }, [])

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ minWidth: '30px', minHeight: '20px', pointerEvents: 'none' }} />
      <SeoElement texts={texts} />
    </div>
  )
}
