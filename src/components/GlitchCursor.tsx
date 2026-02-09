'use client'

import { useEffect, useRef, useState } from 'react'

// ── Cursor variants from computer history ──────────────────────────────
type CursorVariant = 0 | 1 | 2 | 3 | 4
type GlitchType = 'none' | 'chromatic' | 'jitter' | 'switch' | 'flicker' | 'trail'

// Hotspot [x,y] = where the "click point" is relative to top-left
const HOTSPOTS: [number, number][] = [
  [1, 1],   // 0: modern arrow
  [1, 1],   // 1: Mac 1984
  [1, 1],   // 2: Windows 3.1
  [10, 10], // 3: crosshair
  [8, 10],  // 4: hourglass
]

function CursorShape({ variant, fill, stroke }: { variant: CursorVariant; fill?: string; stroke?: string }) {
  switch (variant) {
    case 0: // Modern arrow — clean, slim
      return (
        <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
          <path d="M1 1L1 20L5.5 15.5L9.5 23L12.5 21.5L8.5 13.5L14.5 13.5L1 1Z"
            fill={fill || 'white'} stroke={stroke || 'black'} strokeWidth="1.5" />
        </svg>
      )
    case 1: // Original Macintosh 1984 — small, black
      return (
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
          <path d="M1 1L1 14L3.5 11.5L6 16.5L7.5 15.5L5 10.5L9 10.5L1 1Z"
            fill={fill || 'black'} stroke={stroke || 'white'} strokeWidth="1" />
        </svg>
      )
    case 2: // Windows 3.1 — chunky, bold outline
      return (
        <svg width="18" height="26" viewBox="0 0 18 26" fill="none">
          <path d="M2 1L2 21L7 16L10 23L13 21.5L10 15L16 15L2 1Z"
            fill={fill || 'white'} stroke={stroke || 'black'} strokeWidth="2" />
        </svg>
      )
    case 3: // Crosshair
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="10" y1="0" x2="10" y2="7" stroke={fill || '#0f0'} strokeWidth="1.5" />
          <line x1="10" y1="13" x2="10" y2="20" stroke={fill || '#0f0'} strokeWidth="1.5" />
          <line x1="0" y1="10" x2="7" y2="10" stroke={fill || '#0f0'} strokeWidth="1.5" />
          <line x1="13" y1="10" x2="20" y2="10" stroke={fill || '#0f0'} strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3" stroke={fill || '#0f0'} strokeWidth="1" fill="none" />
        </svg>
      )
    case 4: // Windows hourglass / wait
      return (
        <svg width="16" height="22" viewBox="0 0 16 22" fill="none">
          <rect x="1" y="1" width="14" height="2" fill={fill || 'white'} stroke={stroke || 'black'} strokeWidth="1" />
          <rect x="1" y="19" width="14" height="2" fill={fill || 'white'} stroke={stroke || 'black'} strokeWidth="1" />
          <path d="M3 3L8 11L13 3Z" fill={fill || 'white'} stroke={stroke || 'black'} strokeWidth="1" />
          <path d="M3 19L8 11L13 19Z" fill={fill || 'white'} stroke={stroke || 'black'} strokeWidth="1" />
        </svg>
      )
  }
}

export function GlitchCursor() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: -100, y: -100 })
  const rafRef = useRef(0)
  const [hasMouse, setHasMouse] = useState(false)
  const [variant, setVariant] = useState<CursorVariant>(1)
  const [glitch, setGlitch] = useState<GlitchType>('none')
  const [jitter, setJitter] = useState({ x: 0, y: 0 })
  const [flickerOn, setFlickerOn] = useState(true)

  // Detect mouse (skip on touch-only devices)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)')
    setHasMouse(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setHasMouse(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Track mouse with rAF
  useEffect(() => {
    if (!hasMouse) return
    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (wrapperRef.current) {
            wrapperRef.current.style.transform =
              `translate(${posRef.current.x}px, ${posRef.current.y}px)`
          }
          rafRef.current = 0
        })
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [hasMouse])

  // Glitch scheduler — fires every 0–4 s, runs effect for 150–450 ms
  useEffect(() => {
    if (!hasMouse) return
    let active = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const intervals: ReturnType<typeof setInterval>[] = []

    const clearIntervals = () => {
      intervals.forEach(clearInterval)
      intervals.length = 0
    }

    const schedule = () => {
      const t = setTimeout(() => {
        if (!active) return
        const types: GlitchType[] = ['chromatic', 'jitter', 'switch', 'flicker', 'trail']
        const type = types[Math.floor(Math.random() * types.length)]
        setGlitch(type)

        if (type === 'switch') {
          // Pick a different historical cursor than the current one
          const others = ([1, 2, 3, 4] as CursorVariant[]).filter(v => v !== variant)
          setVariant(others[Math.floor(Math.random() * others.length)])
        }
        if (type === 'jitter') {
          const iv = setInterval(() => {
            setJitter({
              x: (Math.random() - 0.5) * 16,
              y: (Math.random() - 0.5) * 16,
            })
          }, 25)
          intervals.push(iv)
        }
        if (type === 'flicker') {
          const iv = setInterval(() => setFlickerOn(p => !p), 40)
          intervals.push(iv)
        }

        const dur = 150 + Math.random() * 300
        const t2 = setTimeout(() => {
          if (!active) return
          setGlitch('none')
          // Pick a random historical cursor for the idle state too
          setVariant(([1, 2, 3, 4] as CursorVariant[])[Math.floor(Math.random() * 4)])
          setJitter({ x: 0, y: 0 })
          setFlickerOn(true)
          clearIntervals()
          schedule()
        }, dur)
        timers.push(t2)
      }, Math.random() * 1500)
      timers.push(t)
    }

    schedule()
    return () => {
      active = false
      timers.forEach(clearTimeout)
      clearIntervals()
    }
  }, [hasMouse])

  const [hx, hy] = HOTSPOTS[variant]

  return (
    <>
      {/* Always hide the native cursor — rendered even before hasMouse resolves */}
      <style>{`.glitch-cursor-page, .glitch-cursor-page * { cursor: none !important; }`}</style>

      {!hasMouse ? null : <div
        ref={wrapperRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none"
        style={{ willChange: 'transform', transform: 'translate(-100px, -100px)' }}
      >
        {/* Chromatic aberration — 3 RGB offset copies */}
        {glitch === 'chromatic' && (
          <>
            <div className="absolute" style={{ left: -hx - 4, top: -hy + 2, opacity: 0.7 }}>
              <CursorShape variant={variant} fill="#ff0033" stroke="#ff003366" />
            </div>
            <div className="absolute" style={{ left: -hx + 4, top: -hy - 2, opacity: 0.7 }}>
              <CursorShape variant={variant} fill="#00ff66" stroke="#00ff6666" />
            </div>
            <div className="absolute" style={{ left: -hx + 1, top: -hy + 4, opacity: 0.6 }}>
              <CursorShape variant={variant} fill="#3366ff" stroke="#3366ff66" />
            </div>
          </>
        )}

        {/* Trail — fading ghost copies */}
        {glitch === 'trail' && (
          <>
            <div className="absolute" style={{ left: -hx - 12, top: -hy - 10, opacity: 0.15 }}>
              <CursorShape variant={variant} />
            </div>
            <div className="absolute" style={{ left: -hx - 6, top: -hy - 5, opacity: 0.3 }}>
              <CursorShape variant={variant} />
            </div>
          </>
        )}

        {/* Main cursor */}
        <div
          className="absolute"
          style={{
            left: -hx + jitter.x,
            top: -hy + jitter.y,
            opacity: glitch === 'flicker' ? (flickerOn ? 1 : 0.05) : 1,
          }}
        >
          <CursorShape variant={variant} />
        </div>
      </div>}
    </>
  )
}
