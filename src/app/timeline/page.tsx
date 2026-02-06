'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function TimelinePage() {
  const [glitchActive, setGlitchActive] = useState(false)
  const [intenseGlitch, setIntenseGlitch] = useState(false)

  // Random intense glitch intervals
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 150)
      }
      if (Math.random() > 0.7) {
        setIntenseGlitch(true)
        setTimeout(() => setIntenseGlitch(false), 300)
      }
    }, 2000 + Math.random() * 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <main className="page-root relative overflow-hidden">
      {/* Ultra grainy glitched background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: `
            repeating-linear-gradient(0deg, 
              rgba(0, 0, 0, 0.95) 0px, 
              rgba(10, 10, 10, 0.95) 1px, 
              rgba(0, 0, 0, 0.95) 2px
            ),
            repeating-linear-gradient(90deg, 
              rgba(255, 0, 0, 0.03) 0px, 
              rgba(0, 255, 0, 0.03) 1px, 
              rgba(0, 0, 255, 0.03) 2px
            ),
            radial-gradient(circle at 20% 50%, rgba(255, 0, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(0, 0, 255, 0.1) 0%, transparent 50%),
            #0a0a0a
          `,
          backgroundSize: '100% 2px, 2px 100%, 200% 200%, 200% 200%, 200% 200%, 100% 100%',
          animation: 'grainShift 0.5s steps(10) infinite, corruptText 2s ease-in-out infinite',
          filter: intenseGlitch ? 'contrast(1.5) brightness(1.2) hue-rotate(90deg)' : 'contrast(1.1) brightness(1.05)',
          transform: glitchActive ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)` : 'translate(0, 0)',
        }}
      />

      {/* Additional noise overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          animation: 'grainShift 0.3s steps(10) infinite',
          mixBlendMode: 'overlay',
        }}
      />

      {/* RGB split overlay */}
      {intenseGlitch && (
        <motion.div
          className="fixed inset-0 z-10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.4, 0, 0.3, 0],
            x: [-10, 10, -5, 5, 0],
            y: [5, -5, 3, -3, 0],
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full h-full bg-gradient-to-r from-red-500/30 via-green-500/30 to-blue-500/30 mix-blend-screen" />
        </motion.div>
      )}

      {/* Scanlines */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          opacity: 0.4,
          animation: 'vhsFlicker 8s ease-in-out infinite',
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-16 relative z-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto text-center relative"
        >
          {/* Glitch text layers */}
          <div className="relative">
            {/* Reflection layers */}
            <span 
              className="absolute left-1/2 -translate-x-1/2 text-[#666]/20 blur-[4px] translate-y-[6px] scale-y-[-1] select-none pointer-events-none font-grotesk text-6xl md:text-8xl font-light tracking-tighter"
              style={{
                transform: glitchActive ? `translate(-50%, ${6 + Math.random() * 4 - 2}px) scaleY(-1)` : 'translate(-50%, 6px) scaleY(-1)',
              }}
            >
              THIS PAGE<br />UNDER CONSTRUCTION
            </span>
            <span 
              className="absolute left-1/2 -translate-x-1/2 text-red-500/30 blur-[3px] -translate-x-[4px] select-none pointer-events-none font-grotesk text-6xl md:text-8xl font-light tracking-tighter"
              style={{
                transform: glitchActive ? `translate(calc(-50% - ${4 + Math.random() * 4 - 2}px), 0)` : 'translate(calc(-50% - 4px), 0)',
              }}
            >
              THIS PAGE<br />UNDER CONSTRUCTION
            </span>
            <span 
              className="absolute left-1/2 -translate-x-1/2 text-green-500/30 blur-[3px] translate-x-[4px] select-none pointer-events-none font-grotesk text-6xl md:text-8xl font-light tracking-tighter"
              style={{
                transform: glitchActive ? `translate(calc(-50% + ${4 + Math.random() * 4 - 2}px), 0)` : 'translate(calc(-50% + 4px), 0)',
              }}
            >
              THIS PAGE<br />UNDER CONSTRUCTION
            </span>
            <span 
              className="absolute left-1/2 -translate-x-1/2 text-blue-500/30 blur-[3px] translate-y-[2px] select-none pointer-events-none font-grotesk text-6xl md:text-8xl font-light tracking-tighter"
              style={{
                transform: glitchActive ? `translate(-50%, ${2 + Math.random() * 2 - 1}px)` : 'translate(-50%, 2px)',
              }}
            >
              THIS PAGE<br />UNDER CONSTRUCTION
            </span>
            
            {/* Main text */}
            <motion.h1
              className="font-grotesk text-6xl md:text-8xl font-light tracking-tighter relative inline-block"
              animate={glitchActive ? {
                x: [0, -3, 3, -2, 2, 0],
                y: [0, 2, -2, 1, -1, 0],
                textShadow: [
                  '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(0,255,0,0.6)',
                  '0 0 15px rgba(0,0,255,0.8), 0 0 35px rgba(255,0,0,0.6)',
                  '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(0,255,0,0.6)',
                ],
                filter: [
                  'contrast(1.5) brightness(1.3) hue-rotate(0deg)',
                  'contrast(1.8) brightness(1.5) hue-rotate(90deg)',
                  'contrast(1.5) brightness(1.3) hue-rotate(0deg)',
                ],
              } : {
                textShadow: '0 0 30px rgba(255,255,255,0.3), 0 0 60px rgba(0,255,255,0.2)',
                filter: 'contrast(1.2) brightness(1.1)',
              }}
              transition={{ duration: 0.15 }}
              style={{
                animation: intenseGlitch ? 'flicker 0.5s ease-in-out infinite, corruptText 1s ease-in-out infinite' : 'flicker 2s ease-in-out infinite',
              }}
            >
              THIS PAGE<br />UNDER CONSTRUCTION
            </motion.h1>
          </div>

          {/* Subtitle with glitch */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mono text-lg md:text-xl text-[#888] mt-8 tracking-wider flicker corrupt-text relative"
            style={{
              animation: 'flicker 1.5s ease-in-out infinite, corruptText 3s ease-in-out infinite',
              textShadow: `
                0 0 4px rgba(0, 255, 0, 0.6),
                2px 0 0 rgba(255, 0, 0, 0.5),
                -2px 0 0 rgba(0, 0, 255, 0.5),
                0 2px 0 rgba(255, 255, 0, 0.4)
              `,
              filter: 'contrast(1.3) brightness(1.1)',
            }}
          >
            [SYSTEM_CORRUPTION_DETECTED]
          </motion.p>
        </motion.div>
      </div>
    </main>
  )
}

