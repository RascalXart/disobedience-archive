'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { getAllDailies } from '@/lib/data'
import { ExperimentalArchiveCard } from '@/components/ExperimentalArchiveCard'
import { DailyArtworkModal } from '@/components/DailyArtworkModal'
import { useMemo, useState, useEffect } from 'react'
import type { DailyArtwork } from '@/types'

export default function HomePage() {
  const [isReversed, setIsReversed] = useState(false)
  const [selectedDaily, setSelectedDaily] = useState<DailyArtwork | null>(null)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [globalGlitch, setGlobalGlitch] = useState(false)
  const allDailies = getAllDailies()
  const availableDailies = allDailies.filter(d => d.status === 'available')

  // Mouse tracking for global effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX)
      setMouseY(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Random global glitch effects
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlobalGlitch(true)
        setTimeout(() => setGlobalGlitch(false), 300)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Sort dailies based on reverse state
  const sortedDailies = useMemo(() => {
    return isReversed ? [...allDailies].reverse() : allDailies
  }, [allDailies, isReversed])

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: typeof sortedDailies } = {}
    sortedDailies.forEach((daily) => {
      const date = new Date(daily.savedDate)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(daily)
    })
    return groups
  }, [sortedDailies])

  return (
    <main className="min-h-screen pt-24 relative overflow-hidden">
      {/* VHS-style overlay */}
      <div className="vhs-overlay" />
      {/* Always-on scrolling scanline */}
      <div className="scanline" />

      {/* Global glitch overlay */}
      {globalGlitch && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[10001]"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.1, 0, 0.05, 0],
            x: [-5, 5, -3, 3, 0],
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full h-full bg-gradient-to-r from-red-500/10 via-green-500/10 to-blue-500/10 mix-blend-screen" />
        </motion.div>
      )}

      {/* Experimental header */}
      <section className="container mx-auto px-4 py-12 mb-16 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="max-w-5xl mx-auto text-center relative"
        >
          {/* Glitch text effect */}
          <motion.div
            className="mono text-[10px] text-[#666] mb-3 tracking-[0.3em] relative"
            animate={globalGlitch ? {
              x: [-1, 1, -0.5, 0.5, 0],
              opacity: [1, 0.7, 1, 0.8, 1],
            } : {}}
          >
            <span className="absolute left-0 text-red-500/30 blur-[1px]">[ARCHIVE_ENTRY_001]</span>
            <span className="relative">[ARCHIVE_ENTRY_001]</span>
            <span className="absolute left-0 text-blue-500/30 blur-[1px]">[ARCHIVE_ENTRY_001]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="text-5xl md:text-7xl font-grotesk font-light mb-4 tracking-tighter leading-none relative rgb-split"
          >
            {/* Multi-layer reflection effect */}
            <span className="absolute left-0 top-0 text-[#666]/10 blur-[3px] translate-y-[4px] scale-y-[-1] select-none pointer-events-none">
              RASCAL
            </span>
            <span className="absolute left-0 top-0 text-red-500/20 blur-[2px] -translate-x-[2px] select-none pointer-events-none">
              RASCAL
            </span>
            <span className="absolute left-0 top-0 text-green-500/20 blur-[2px] translate-x-[2px] select-none pointer-events-none">
              RASCAL
            </span>
            <span className="absolute left-0 top-0 text-blue-500/20 blur-[2px] translate-y-[1px] select-none pointer-events-none">
              RASCAL
            </span>
            <motion.span
              className="inline-block relative"
              animate={{
                textShadow: globalGlitch 
                  ? ['0 0 10px rgba(255,0,0,0.5), 0 0 20px rgba(0,255,0,0.3)', '0 0 5px rgba(0,0,255,0.5), 0 0 15px rgba(255,0,0,0.3)', '0 0 10px rgba(255,0,0,0.5), 0 0 20px rgba(0,255,0,0.3)']
                  : '0 0 20px rgba(255,255,255,0.1)',
              }}
              transition={{ duration: 0.3 }}
            >
              RASCAL
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mono text-xs text-[#888] mb-8 tracking-wider flicker relative text-hover-glitch"
          >
            {/* Text reflection layers */}
            <span className="absolute left-0 top-0 text-[#888]/10 blur-[2px] translate-y-[3px] scale-y-[-1] select-none pointer-events-none">
              DAILY WORKS ARCHIVE<br />
              CURRENT PRICE: 0.1Ξ PER DAILY<br />
              <span className="text-[9px]">(PRICE GOES UP 10% PER PURCHASE OF DAILY)</span>
            </span>
            <span className="absolute left-0 top-0 text-green-500/15 blur-[1px] translate-x-[1px] select-none pointer-events-none">
              DAILY WORKS ARCHIVE<br />
              CURRENT PRICE: 0.1Ξ PER DAILY<br />
              <span className="text-[9px]">(PRICE GOES UP 10% PER PURCHASE OF DAILY)</span>
            </span>
            <span className="relative">
              DAILY WORKS ARCHIVE<br />
              CURRENT PRICE: 0.1Ξ PER DAILY<br />
              <span className="text-[9px]">(PRICE GOES UP 10% PER PURCHASE OF DAILY)</span>
            </span>
          </motion.p>
          
          {availableDailies.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/collect">
                <motion.div
                  className="inline-flex items-center gap-2 mono text-[10px] text-[#666] hover:text-white transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <span className="group-hover:glitch">[COLLECT]</span>
                  <span className="text-[#444]">→</span>
                  <span>{availableDailies.length} AVAILABLE</span>
                </motion.div>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Experimental archive layout */}
      <section className="container mx-auto px-3 sm:px-4 pb-24 relative">
        <div className="max-w-7xl mx-auto">
          {/* Controls with glitch effects and reflections */}
          <motion.div
            className="mono text-[9px] text-[#666] mb-8 sticky top-24 bg-[#0a0a0a]/95 backdrop-blur-sm py-3 z-10 border-b border-[#222] tracking-wider flex items-center justify-between relative"
            animate={globalGlitch ? {
              x: [-0.5, 0.5, 0],
              opacity: [1, 0.8, 1],
            } : {}}
          >
            {/* Reflection layers */}
            <span className="absolute left-0 top-0 text-[#666]/10 blur-[1px] translate-y-[2px] scale-y-[-1] select-none pointer-events-none py-3">
              [ARCHIVE_VIEW] | {allDailies.length} ENTRIES | {isReversed ? 'REVERSE CHRONOLOGICAL' : 'CHRONOLOGICAL ORDER'}
            </span>
            <span className="absolute left-0 top-0 text-green-500/10 blur-[0.5px] translate-x-[1px] select-none pointer-events-none py-3">
              [ARCHIVE_VIEW] | {allDailies.length} ENTRIES | {isReversed ? 'REVERSE CHRONOLOGICAL' : 'CHRONOLOGICAL ORDER'}
            </span>
            <span className="flicker relative text-hover-glitch">
              [ARCHIVE_VIEW] | {allDailies.length} ENTRIES | {isReversed ? 'REVERSE CHRONOLOGICAL' : 'CHRONOLOGICAL ORDER'}
            </span>
            <button
              onClick={() => setIsReversed(!isReversed)}
              className="mono text-[9px] px-3 py-1 border border-[#333] hover:border-[#555] text-[#888] hover:text-white transition-all duration-300 hover:glitch text-hover-glitch"
            >
              [{isReversed ? '↑' : '↓'} REVERSE]
            </button>
          </motion.div>

          {/* Experimental grouped display */}
          <div className="space-y-20 md:space-y-32">
            {Object.entries(groupedByMonth).map(([month, dailies], monthIndex) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: monthIndex * 0.1, duration: 0.8 }}
                className="relative"
              >
                {/* Distorted month header with reflections */}
                <motion.div
                  className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 pb-4 border-b border-[#222] relative"
                  animate={{
                    x: globalGlitch ? [-1, 1, 0] : 0,
                  }}
                >
                  <div className="flex items-baseline gap-3 relative">
                    {/* Text reflection layers */}
                    <span className="absolute left-0 top-0 text-[#999]/10 blur-[2px] translate-y-[2px] scale-y-[-1] select-none pointer-events-none font-grotesk text-lg md:text-2xl font-light tracking-tighter">
                      {month.toUpperCase()}
                    </span>
                    <span className="absolute left-0 top-0 text-green-500/15 blur-[1px] translate-x-[1px] select-none pointer-events-none font-grotesk text-lg md:text-2xl font-light tracking-tighter">
                      {month.toUpperCase()}
                    </span>
                    <motion.div
                      className="font-grotesk text-lg md:text-2xl font-light text-[#999] tracking-tighter relative rgb-split"
                      animate={globalGlitch ? {
                        textShadow: ['0 0 5px rgba(255,0,0,0.3)', '0 0 5px rgba(0,255,0,0.3)', 'none'],
                      } : {}}
                    >
                      {month.toUpperCase()}
                    </motion.div>
                    <div className="mono text-[9px] text-[#555] corrupt-text">
                      {new Date(dailies[0].savedDate).getFullYear()}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="mono text-[9px] text-[#666] tracking-wider flicker relative">
                    <span className="absolute left-0 top-0 text-[#666]/10 blur-[1px] translate-y-[1px] scale-y-[-1] select-none pointer-events-none">
                      {dailies.length} {dailies.length === 1 ? 'ENTRY' : 'ENTRIES'}
                    </span>
                    <span className="relative">
                      {dailies.length} {dailies.length === 1 ? 'ENTRY' : 'ENTRIES'}
                    </span>
                  </div>
                </motion.div>

                {/* Non-linear experimental grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 relative">
                  {dailies.map((daily, index) => {
                    const globalIndex = sortedDailies.findIndex(d => d.id === daily.id)
                    return (
                      <ExperimentalArchiveCard
                        key={daily.id}
                        daily={daily}
                        index={globalIndex}
                        onClick={() => setSelectedDaily(daily)}
                        mouseX={mouseX}
                        mouseY={mouseY}
                      />
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="container mx-auto px-4 py-16 border-t border-[#222] relative">
        <div className="max-w-5xl mx-auto">
          <div className="mono text-[9px] text-[#666] mb-6 tracking-wider text-center flicker relative">
            <span className="absolute left-1/2 -translate-x-1/2 text-[#666]/10 blur-[1px] translate-y-[2px] scale-y-[-1] select-none pointer-events-none">
              [ARCHIVE_STATS]
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 text-green-500/10 blur-[0.5px] translate-x-[1px] select-none pointer-events-none">
              [ARCHIVE_STATS]
            </span>
            <span className="relative">[ARCHIVE_STATS]</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { label: 'TOTAL WORKS', value: allDailies.length },
              { label: 'AVAILABLE', value: availableDailies.length, color: '#4a4' },
              { label: 'COLLECTED', value: allDailies.filter(d => d.status === 'sold').length },
              { label: 'MONTHS', value: Object.keys(groupedByMonth).length },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                animate={globalGlitch ? {
                  x: [-0.5, 0.5, 0],
                  opacity: [1, 0.7, 1],
                } : {}}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="text-2xl md:text-3xl font-grotesk font-light mb-2"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div className="mono text-[9px] text-[#666] tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal */}
      {selectedDaily && (
        <DailyArtworkModal
          daily={selectedDaily}
          allDailies={sortedDailies}
          onClose={() => setSelectedDaily(null)}
        />
      )}
    </main>
  )
}
