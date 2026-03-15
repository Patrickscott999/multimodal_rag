import { useEffect, useRef } from 'react'

export default function AuroraBackground() {
  const el = useRef(null)
  const vanta = useRef(null)

  useEffect(() => {
    if (!window.VANTA) return
    vanta.current = window.VANTA.DOTS({
      el: el.current,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1.0,
      scaleMobile: 1.0,
    })
    return () => vanta.current?.destroy()
  }, [])

  return (
    <div
      ref={el}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
}
