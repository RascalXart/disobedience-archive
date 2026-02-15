'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { getAllDailies } from '@/lib/data'
import { ExperimentalArchiveCard } from '@/components/ExperimentalArchiveCard'
import { DailyArtworkModal } from '@/components/DailyArtworkModal'
import { useMemo, useState, useEffect, useRef } from 'react'
import type { DailyArtwork } from '@/types'

export default function HomePage() {
  const [isReversed, setIsReversed] = useState(false)
  const [showMintedOnly, setShowMintedOnly] = useState(false)
  const [selectedDaily, setSelectedDaily] = useState<DailyArtwork | null>(null)
  const [globalGlitch, setGlobalGlitch] = useState(false)
  const [titleText, setTitleText] = useState<'RASCAL' | 'RVSCVNX'>('RASCAL')
  const [titleGlitching, setTitleGlitching] = useState(false)
  const [glitchLetterIndex, setGlitchLetterIndex] = useState<number | null>(null)
  const [glitchLetterIndex2, setGlitchLetterIndex2] = useState<number | null>(null)
  const [glitchLetterIndex3, setGlitchLetterIndex3] = useState<number | null>(null)
  const [glitchLetterIndex4, setGlitchLetterIndex4] = useState<number | null>(null)
  const [glitchLetterSub1, setGlitchLetterSub1] = useState<string | null>(null)
  const [glitchLetterSub2, setGlitchLetterSub2] = useState<string | null>(null)
  const [glitchLetterSub3, setGlitchLetterSub3] = useState<string | null>(null)
  const [glitchLetterSub4, setGlitchLetterSub4] = useState<string | null>(null)
  const [glitchFontMap, setGlitchFontMap] = useState<Record<number, string>>({})
  const [subtitlePhrase, setSubtitlePhrase] = useState<string | null>(null)
  const [subtitleVisibleLength, setSubtitleVisibleLength] = useState(0)
  const allDailies = getAllDailies()

  const TYPED_PHRASES = ['DISOBEDIENCE_ARCHIVE', 'ETERNAL_MUSE', 'CØNCLAVE_001.exe', 'WINIØNS']
  const availableDailies = allDailies.filter(d => d.status === 'available')
  const isModalOpen = selectedDaily !== null

  // Sort dailies based on reverse state, optionally filter to minted only
  const sortedDailies = useMemo(() => {
    const base = showMintedOnly ? allDailies.filter(d => d.minted) : allDailies
    return isReversed ? [...base].reverse() : base
  }, [allDailies, isReversed, showMintedOnly])

  // Symbol substitutions: push symbols often (S→$, A→Λ/∧, R→Я, C→©, L→£, N→И, V→√)
  const pickLetterSub = (char: string) => {
    const r = Math.random()
    if (char === 'S' && r > 0.2) return '$'
    if (char === 'A' && r > 0.2) return r > 0.6 ? 'Λ' : '∧'
    if (char === 'R' && r > 0.55) return 'Я'
    if (char === 'C' && r > 0.6) return '©'
    if (char === 'L' && r > 0.65) return '£'
    if (char === 'N' && r > 0.65) return 'И'
    if (char === 'V' && r > 0.7) return '√'
    return null
  }

  const FONT_GLITCH_CLASSES = ['title-glitch-font-mono', 'title-glitch-font-italic', 'title-glitch-font-narrow'] as const

  const clearGlitchLetters = () => {
    setTitleGlitching(false)
    setGlitchLetterIndex(null)
    setGlitchLetterIndex2(null)
    setGlitchLetterIndex3(null)
    setGlitchLetterIndex4(null)
    setGlitchLetterSub1(null)
    setGlitchLetterSub2(null)
    setGlitchLetterSub3(null)
    setGlitchLetterSub4(null)
    setGlitchFontMap({})
  }

  // RASCAL <-> RVSCVNX: 2–4 letters glitch with symbols + font chaos, fast and chaotic
  const runTitleGlitch = () => {
    const len = 6
    const pickDistinct = (n: number) => {
      const out: number[] = []
      while (out.length < n) {
        const a = Math.floor(Math.random() * len)
        if (!out.includes(a)) out.push(a)
      }
      return out
    }
    const numLetters = Math.random() < 0.5 ? 4 : Math.random() < 0.6 ? 3 : 2
    const indices = pickDistinct(numLetters)
    const glitchDur = 60 + Math.random() * 320
    const switchDelay = 50 + Math.random() * 700
    const text1 = 'RVSCVNX'

    setTitleGlitching(true)
    setTitleText('RVSCVNX')
    setGlitchLetterIndex(null)
    setGlitchLetterIndex2(null)
    setGlitchLetterIndex3(null)
    setGlitchLetterIndex4(null)
    setGlitchLetterSub1(null)
    setGlitchLetterSub2(null)
    setGlitchLetterSub3(null)
    setGlitchLetterSub4(null)
    const used = new Set(indices)
    const available = [0, 1, 2, 3, 4, 5].filter(i => !used.has(i))
    const take = Math.min(available.length, Math.floor(Math.random() * 3))
    const fontIndices = [...available].sort(() => Math.random() - 0.5).slice(0, take)
    setGlitchFontMap(
      Object.fromEntries(
        fontIndices.map(i => [i, FONT_GLITCH_CLASSES[Math.floor(Math.random() * FONT_GLITCH_CLASSES.length)]])
      )
    )

    const timeouts: ReturnType<typeof setTimeout>[] = []
    indices.forEach((idx, pos) => {
      const delay = Math.random() * 80 + pos * 25
      const t = setTimeout(() => {
        if (pos === 0) { setGlitchLetterIndex(idx); setGlitchLetterSub1(pickLetterSub(text1[idx])) }
        else if (pos === 1) { setGlitchLetterIndex2(idx); setGlitchLetterSub2(pickLetterSub(text1[idx])) }
        else if (pos === 2) { setGlitchLetterIndex3(idx); setGlitchLetterSub3(pickLetterSub(text1[idx])) }
        else { setGlitchLetterIndex4(idx); setGlitchLetterSub4(pickLetterSub(text1[idx])) }
      }, delay)
      timeouts.push(t)
    })
    const tClear = setTimeout(clearGlitchLetters, glitchDur)
    timeouts.push(tClear)

    const t2 = setTimeout(() => {
      const indices2 = pickDistinct(Math.random() < 0.5 ? 4 : Math.random() < 0.6 ? 3 : 2)
      const glitchDur2 = 60 + Math.random() * 320
      const text2 = 'RASCAL'
      setTitleGlitching(true)
      setTitleText('RASCAL')
      setGlitchLetterIndex(null)
      setGlitchLetterIndex2(null)
      setGlitchLetterIndex3(null)
      setGlitchLetterIndex4(null)
      setGlitchLetterSub1(null)
      setGlitchLetterSub2(null)
      setGlitchLetterSub3(null)
      setGlitchLetterSub4(null)
      const used2 = new Set(indices2)
      const available2 = [0, 1, 2, 3, 4, 5].filter(i => !used2.has(i))
      const take2 = Math.min(available2.length, Math.floor(Math.random() * 3))
      const fontIndices2 = [...available2].sort(() => Math.random() - 0.5).slice(0, take2)
      setGlitchFontMap(
        Object.fromEntries(
          fontIndices2.map(i => [i, FONT_GLITCH_CLASSES[Math.floor(Math.random() * FONT_GLITCH_CLASSES.length)]])
        )
      )
      const timeouts2: ReturnType<typeof setTimeout>[] = []
      indices2.forEach((idx, pos) => {
        const delay = Math.random() * 80 + pos * 25
        const t = setTimeout(() => {
          if (pos === 0) { setGlitchLetterIndex(idx); setGlitchLetterSub1(pickLetterSub(text2[idx])) }
          else if (pos === 1) { setGlitchLetterIndex2(idx); setGlitchLetterSub2(pickLetterSub(text2[idx])) }
          else if (pos === 2) { setGlitchLetterIndex3(idx); setGlitchLetterSub3(pickLetterSub(text2[idx])) }
          else { setGlitchLetterIndex4(idx); setGlitchLetterSub4(pickLetterSub(text2[idx])) }
        }, delay)
        timeouts2.push(t)
      })
      timeouts2.push(setTimeout(clearGlitchLetters, glitchDur2))
      return () => timeouts2.forEach(clearTimeout)
    }, switchDelay)
    timeouts.push(t2)
    return () => timeouts.forEach(clearTimeout)
  }

  useEffect(() => {
    const ref = { current: null as ReturnType<typeof setTimeout> | null }
    const scheduleNext = () => {
      if (ref.current) clearTimeout(ref.current)
      const delay = Math.random() < 0.5 ? 80 + Math.random() * 600 : 400 + Math.random() * 1800
      ref.current = setTimeout(() => {
        runTitleGlitch()
        if (Math.random() < 0.55) {
          const burst = setTimeout(() => {
            runTitleGlitch()
            if (Math.random() < 0.35) {
              const burst2 = setTimeout(() => { runTitleGlitch(); scheduleNext() }, 80 + Math.random() * 350)
              ref.current = burst2
            } else scheduleNext()
          }, 60 + Math.random() * 400)
          ref.current = burst
        } else scheduleNext()
      }, delay)
    }
    ref.current = setTimeout(() => { runTitleGlitch(); scheduleNext() }, 80 + Math.random() * 500)
    return () => { if (ref.current) clearTimeout(ref.current) }
  }, [])

  // Typed subtitle: type in fast (chunked), hold, delete back fast (chunked), then next phrase
  useEffect(() => {
    const TICK = 4
    let typingId: ReturnType<typeof setInterval> | null = null
    let deleteId: ReturnType<typeof setInterval> | null = null
    let holdId: ReturnType<typeof setTimeout> | null = null
    let nextId: ReturnType<typeof setTimeout> | null = null

    const startPhrase = () => {
      const phrase = TYPED_PHRASES[Math.floor(Math.random() * TYPED_PHRASES.length)]
      setSubtitlePhrase(phrase)
      setSubtitleVisibleLength(0)
      const typeChunk = Math.max(1, Math.ceil(phrase.length / 4))
      let len = 0
      typingId = setInterval(() => {
        len = Math.min(len + typeChunk, phrase.length)
        setSubtitleVisibleLength(len)
        if (len >= phrase.length) {
          if (typingId) clearInterval(typingId)
          typingId = null
          holdId = setTimeout(() => {
            holdId = null
            let del = phrase.length
            const deleteChunk = Math.max(1, Math.ceil(phrase.length / 6))
            deleteId = setInterval(() => {
              del = Math.max(0, del - deleteChunk)
              setSubtitleVisibleLength(del)
              if (del <= 0) {
                if (deleteId) clearInterval(deleteId)
                deleteId = null
                setSubtitlePhrase(null)
                nextId = setTimeout(startPhrase, Math.random() * 4000)
              }
            }, TICK)
          }, 600 + Math.random() * 2200)
        }
      }, TICK)
    }

    nextId = setTimeout(startPhrase, Math.random() * 3000)
    return () => {
      if (typingId) clearInterval(typingId)
      if (deleteId) clearInterval(deleteId)
      if (holdId) clearTimeout(holdId)
      if (nextId) clearTimeout(nextId)
    }
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

  // Native Intersection Observer for scroll animations (replaces ScrollReveal)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.hasAttribute('data-revealed')) {
            entry.target.setAttribute('data-revealed', 'true')
            
            // Cast to HTMLElement for style access
            const element = entry.target as HTMLElement
            
            // Get animation type
            const type = element.getAttribute('data-scroll-reveal')
            const index = parseInt(element.getAttribute('data-index') || '0')
            
            if (type === 'card') {
              // Staggered card animation
              const delay = (index % 6) * 60
              element.style.opacity = '0'
              element.style.transform = 'translateY(50px) scale(0.9)'
              element.style.transition = `opacity 1s cubic-bezier(0.5, 0, 0, 1) ${delay}ms, transform 1s cubic-bezier(0.5, 0, 0, 1) ${delay}ms`
              
              requestAnimationFrame(() => {
                element.style.opacity = '1'
                element.style.transform = 'translateY(0) scale(1)'
              })
            } else if (type === 'month') {
              // Month header animation
              const delay = index * 100
              element.style.opacity = '0'
              element.style.transform = 'translateY(40px)'
              element.style.transition = `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms`
              
              requestAnimationFrame(() => {
                element.style.opacity = '1'
                element.style.transform = 'translateY(0)'
              })
            }
          }
        })
      },
      {
        threshold: 0.15, // Trigger when 15% visible
        rootMargin: '0px',
      }
    )

    // Observe all elements with data-scroll-reveal
    const elements = document.querySelectorAll('[data-scroll-reveal]')
    elements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [sortedDailies, isReversed]) // Re-run when dailies change

  // Group by month, sorted chronologically
  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: { date: Date; items: typeof sortedDailies } } = {}
    sortedDailies.forEach((daily) => {
      const date = new Date(daily.savedDate)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      if (!groups[monthKey]) {
        groups[monthKey] = { date: new Date(date.getFullYear(), date.getMonth(), 1), items: [] }
      }
      groups[monthKey].items.push(daily)
    })
    const sorted = Object.entries(groups).sort(
      ([, a], [, b]) => a.date.getTime() - b.date.getTime()
    )
    const result: { [key: string]: typeof sortedDailies } = {}
    for (const [key, val] of sorted) {
      result[key] = val.items
    }
    return result
  }, [sortedDailies])

  const dailyIndexById = useMemo(() => {
    const map = new Map<string, number>()
    sortedDailies.forEach((daily, index) => {
      map.set(daily.id, index)
    })
    return map
  }, [sortedDailies])

  return (
    <main className="page-root relative overflow-hidden">
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
            <span className={`block relative ${titleGlitching ? 'title-glitch-transition' : ''}`}>
            {/* Multi-layer reflection effect */}
            <span className="absolute left-0 top-0 text-[#666]/10 blur-[3px] translate-y-[4px] scale-y-[-1] select-none pointer-events-none">
              {titleText}
            </span>
            <span className="absolute left-0 top-0 text-red-500/20 blur-[2px] -translate-x-[2px] select-none pointer-events-none">
              {titleText}
            </span>
            <span className="absolute left-0 top-0 text-green-500/20 blur-[2px] translate-x-[2px] select-none pointer-events-none">
              {titleText}
            </span>
            <span className="absolute left-0 top-0 text-blue-500/20 blur-[2px] translate-y-[1px] select-none pointer-events-none">
              {titleText}
            </span>
            <span className="inline-block relative">
              <motion.span
                className="inline-block relative"
                animate={{
                  textShadow: globalGlitch 
                    ? ['0 0 10px rgba(255,0,0,0.5), 0 0 20px rgba(0,255,0,0.3)', '0 0 5px rgba(0,0,255,0.5), 0 0 15px rgba(255,0,0,0.3)', '0 0 10px rgba(255,0,0,0.5), 0 0 20px rgba(0,255,0,0.3)']
                    : '0 0 20px rgba(255,255,255,0.1)',
                }}
                transition={{ duration: 0.3 }}
              >
                {titleText.split('').map((char, i) => {
                  const isGlitchLetter = titleGlitching && glitchLetterIndex === i
                  const isGlitchLetter2 = titleGlitching && glitchLetterIndex2 === i
                  const isGlitchLetter3 = titleGlitching && glitchLetterIndex3 === i
                  const isGlitchLetter4 = titleGlitching && glitchLetterIndex4 === i
                  const displayChar =
                    (isGlitchLetter && glitchLetterSub1) ? glitchLetterSub1 :
                    (isGlitchLetter2 && glitchLetterSub2) ? glitchLetterSub2 :
                    (isGlitchLetter3 && glitchLetterSub3) ? glitchLetterSub3 :
                    (isGlitchLetter4 && glitchLetterSub4) ? glitchLetterSub4 : char
                  const styleClass =
                    isGlitchLetter ? 'title-glitch-letter' :
                    isGlitchLetter2 ? 'title-glitch-letter-2' :
                    isGlitchLetter3 ? 'title-glitch-letter-3' :
                    isGlitchLetter4 ? 'title-glitch-letter-4' : ''
                  const fontClass = titleGlitching && glitchFontMap[i] ? glitchFontMap[i] : ''
                  return (
                    <span
                      key={`${titleText}-${i}`}
                      className={`${styleClass} ${fontClass}`.trim() || undefined}
                    >
                      {displayChar}
                    </span>
                  )
                })}
              </motion.span>
              {subtitlePhrase && (
                <span
                  className="absolute left-full bottom-0 ml-2 leading-none text-xs text-[#666] tracking-[0.3em] uppercase whitespace-nowrap"
                  style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontWeight: 400, animation: 'none', textShadow: 'none', transform: 'translateY(-0.8em)' }}
                >
                  <span className={`inline-block ${titleGlitching ? 'title-glitch-transition' : ''}`}>
                    /{subtitlePhrase.slice(0, subtitleVisibleLength).toUpperCase()}
                    {subtitleVisibleLength < subtitlePhrase.length && (
                      <span className="inline-block w-0.5 h-3 align-middle bg-[#555] ml-0.5 animate-pulse" style={{ animationDuration: '0.6s' }} />
                    )}
                  </span>
                </span>
              )}
            </span>
            </span>
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
              <span className="text-[9px]">(PRICE GOES UP 10% PER PURCHASE OF EVERYDAY)</span>
            </span>
            <span className="absolute left-0 top-0 text-green-500/15 blur-[1px] translate-x-[1px] select-none pointer-events-none">
              DAILY WORKS ARCHIVE<br />
              CURRENT PRICE: 0.1Ξ PER DAILY<br />
              <span className="text-[9px]">(PRICE GOES UP 10% PER PURCHASE OF EVERYDAY)</span>
            </span>
            <span className="relative">
              DAILY WORKS ARCHIVE<br />
              CURRENT PRICE: 0.1Ξ PER DAILY<br />
              <span className="text-[9px]">(PRICE GOES UP 10% PER PURCHASE OF EVERYDAY)</span>
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
              [ARCHIVE_VIEW] | {sortedDailies.length} ENTRIES | {showMintedOnly ? 'MINTED ONLY' : isReversed ? 'REVERSE CHRONOLOGICAL' : 'CHRONOLOGICAL ORDER'}
            </span>
            <span className="absolute left-0 top-0 text-green-500/10 blur-[0.5px] translate-x-[1px] select-none pointer-events-none py-3">
              [ARCHIVE_VIEW] | {sortedDailies.length} ENTRIES | {showMintedOnly ? 'MINTED ONLY' : isReversed ? 'REVERSE CHRONOLOGICAL' : 'CHRONOLOGICAL ORDER'}
            </span>
            <span className="flicker relative text-hover-glitch">
              [ARCHIVE_VIEW] | {sortedDailies.length} ENTRIES | {showMintedOnly ? 'MINTED ONLY' : isReversed ? 'REVERSE CHRONOLOGICAL' : 'CHRONOLOGICAL ORDER'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMintedOnly(!showMintedOnly)}
                className={`mono text-[9px] px-3 py-1 border transition-all duration-300 hover:glitch text-hover-glitch ${
                  showMintedOnly
                    ? 'border-red-500/50 text-red-400 bg-red-500/10'
                    : 'border-[#333] hover:border-[#555] text-[#888] hover:text-white'
                }`}
              >
                [MINTED]
              </button>
              <button
                onClick={() => setIsReversed(!isReversed)}
                className="mono text-[9px] px-3 py-1 border border-[#333] hover:border-[#555] text-[#888] hover:text-white transition-all duration-300 hover:glitch text-hover-glitch"
              >
                [{isReversed ? '↑' : '↓'} REVERSE]
              </button>
            </div>
          </motion.div>

          {/* Experimental grouped display */}
          <div className="space-y-6 md:space-y-10">
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
                  className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 pb-3 border-b border-[#222] relative"
                  animate={{
                    x: globalGlitch ? [-1, 1, 0] : 0,
                  }}
                  data-scroll-reveal="month"
                  data-index={monthIndex}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-12 relative">
                  {dailies.map((daily, index) => {
                    const globalIndex = dailyIndexById.get(daily.id) ?? index
                    return (
                              <div key={daily.id} data-scroll-reveal="card" data-index={globalIndex}>
                                <ExperimentalArchiveCard
                                  daily={daily}
                                  index={globalIndex}
                                  onClick={() => setSelectedDaily(daily)}
                                  isModalOpen={isModalOpen}
                                />
                              </div>
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
