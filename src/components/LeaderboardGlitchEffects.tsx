'use client'

import { useEffect, useRef, useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────
const GLITCH_COLORS = [
  'rgba(255,0,50,0.8)', 'rgba(0,255,100,0.8)', 'rgba(0,100,255,0.8)',
  'rgba(255,255,0,0.6)', 'rgba(0,255,255,0.7)', 'rgba(255,0,255,0.5)',
]
const CORRUPT_CHARS = '░▒▓█▀▄01ABCDEF'

// ── Types ──────────────────────────────────────────────────────────────
interface ScreenTear { top: number; height: number; shift: number; id: number }
interface CorruptPatch { x: number; y: number; chars: string; id: number; color: string }

export function LeaderboardGlitchEffects() {
  const [tears, setTears] = useState<ScreenTear[]>([])
  const tearIdRef = useRef(0)

  const [patches, setPatches] = useState<CorruptPatch[]>([])
  const patchIdRef = useRef(0)

  // ── Screen tears ─────────────────────────────────────────────────────
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>
    const fire = () => {
      const n = 1 + Math.floor(Math.random() * 3)
      setTears(Array.from({ length: n }, () => ({
        top: Math.random() * 100,
        height: 0.3 + Math.random() * 2,
        shift: (Math.random() - 0.5) * 40,
        id: tearIdRef.current++,
      })))
      setTimeout(() => setTears([]), 30 + Math.random() * 70)
    }
    const loop = () => { tid = setTimeout(() => { fire(); loop() }, 400 + Math.random() * 2500) }
    loop()
    return () => clearTimeout(tid)
  }, [])

  // ── Data corruption patches ──────────────────────────────────────────
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>
    const fire = () => {
      const n = 1 + Math.floor(Math.random() * 3)
      setPatches(Array.from({ length: n }, () => ({
        x: Math.random() * 90,
        y: Math.random() * 90,
        chars: Array.from({ length: 4 + Math.floor(Math.random() * 12) }, () =>
          CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)]
        ).join(''),
        color: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)],
        id: patchIdRef.current++,
      })))
      setTimeout(() => setPatches([]), 40 + Math.random() * 120)
    }
    const loop = () => { tid = setTimeout(() => { fire(); loop() }, 500 + Math.random() * 3000) }
    loop()
    return () => clearTimeout(tid)
  }, [])

  return (
    <>
      {/* ── Global glitch CSS ─────────────────────────────────────────── */}
      <style>{`
        @keyframes vhsBand {
          0% { top: -50px; }
          100% { top: 100vh; }
        }
        @keyframes rowGlitch {
          0%, 100% { transform: translateX(0); clip-path: none; }
          15% { transform: translateX(-5px) skewX(-1deg); clip-path: inset(0 0 50% 0); }
          30% { transform: translateX(4px) skewX(0.5deg); clip-path: inset(40% 0 0 0); }
          50% { transform: translateX(-2px); clip-path: inset(20% 0 40% 0); }
          70% { transform: translateX(3px) skewX(-0.5deg); clip-path: none; }
          85% { transform: translateX(-1px); }
        }
        @keyframes headerDistort {
          0%, 100% { transform: translateX(0) scaleX(1); filter: none; }
          10% { transform: translateX(-3px) scaleX(1.003); }
          20% { transform: translateX(4px) scaleX(0.997); filter: hue-rotate(40deg); }
          40% { transform: translateX(-2px) scaleX(1.002); }
          60% { transform: translateX(1px) scaleX(0.998); filter: hue-rotate(-30deg); }
          80% { transform: translateX(2px) scaleX(1.001); }
        }
        @keyframes rgbPulse {
          0%, 100% { text-shadow: -1px 0 rgba(255,0,50,0.3), 1px 0 rgba(0,255,100,0.3); }
          25% { text-shadow: -2px 0 rgba(255,0,50,0.6), 2px 0 rgba(0,255,100,0.6), 0 1px rgba(100,100,255,0.4); }
          50% { text-shadow: -1px 0 rgba(255,0,50,0.2), 1px 0 rgba(0,255,100,0.2); }
          75% { text-shadow: -3px 0 rgba(255,0,50,0.5), 2px 0 rgba(0,255,100,0.5), 0 -1px rgba(100,100,255,0.3); }
        }

        /* RGB text split — always on */
        .lb-header {
          animation: rgbPulse 4s ease-in-out infinite, headerDistort 8s ease-in-out infinite;
        }

        /* Row hover glitch */
        .lb-row {
          transition: text-shadow 0.15s, transform 0.15s;
        }
        .lb-row:hover {
          animation: rowGlitch 0.25s steps(4) 1;
          text-shadow: -2px 0 rgba(255,0,50,0.5), 2px 0 rgba(0,255,100,0.5);
        }

      `}</style>

      {/* ── Screen tears ─────────────────────────────────────────────── */}
      {tears.map(tear => (
        <div key={tear.id} className="fixed left-0 right-0 pointer-events-none z-[9995]" style={{
          top: `${tear.top}%`, height: `${tear.height}%`,
          background: 'rgba(255,255,255,0.1)',
          transform: `translateX(${tear.shift}px)`,
          mixBlendMode: 'difference',
          borderTop: '1px solid rgba(0,255,100,0.15)',
          borderBottom: '1px solid rgba(255,0,50,0.15)',
        }} />
      ))}

      {/* ── Data corruption patches ──────────────────────────────────── */}
      {patches.map(p => (
        <div key={p.id} className="fixed pointer-events-none z-[9994] mono text-[9px]" style={{
          left: `${p.x}%`, top: `${p.y}%`,
          color: p.color, opacity: 0.6,
          textShadow: `-1px 0 rgba(255,0,50,0.8), 1px 0 rgba(0,255,100,0.8)`,
          mixBlendMode: 'screen',
        }}>
          {p.chars}
        </div>
      ))}

      {/* ── VHS tracking band ────────────────────────────────────────── */}
      <div className="fixed left-0 right-0 pointer-events-none z-[9993]" style={{
        height: 20,
        background: 'linear-gradient(transparent, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 70%, transparent)',
        animation: 'vhsBand 12s linear infinite',
        mixBlendMode: 'overlay',
      }} />

    </>
  )
}
