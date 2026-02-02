'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { DailyArtwork } from '@/types'
import { resolveDailyMediaUrl } from '@/lib/data'
import { generateTwitterShareUrl } from '@/lib/twitter-share'

interface DailyArtworkModalProps {
  daily: DailyArtwork
  allDailies: DailyArtwork[]
  onClose: () => void
}

export function DailyArtworkModal({ daily, allDailies, onClose }: DailyArtworkModalProps) {
  const [currentIndex, setCurrentIndex] = useState(
    allDailies.findIndex(d => d.id === daily.id)
  )
  const [currentDaily, setCurrentDaily] = useState(daily)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') navigatePrevious()
      if (e.key === 'ArrowRight') navigateNext()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [currentIndex])

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setCurrentDaily(allDailies[newIndex])
    }
  }

  const navigateNext = () => {
    if (currentIndex < allDailies.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setCurrentDaily(allDailies[newIndex])
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const isVideo = currentDaily.imageUrl.endsWith('.mp4') || currentDaily.imageUrl.endsWith('.mov')

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]"
        onClick={handleBackdropClick}
      >
        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigatePrevious()
            }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-[#222] mono text-xs text-[#666] hover:text-white transition-all z-10"
            aria-label="Previous artwork"
          >
            ←
          </button>
        )}

        {currentIndex < allDailies.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigateNext()
            }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-[#222] mono text-xs text-[#666] hover:text-white transition-all z-10"
            aria-label="Next artwork"
          >
            →
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-[#222] mono text-xs text-[#666] hover:text-white transition-all"
          aria-label="Close modal"
        >
          [CLOSE]
        </button>

        {/* Modal content */}
        <motion.div
          key={currentDaily.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
          className={`relative w-full max-w-6xl max-h-[90vh] overflow-auto bg-[#0a0a0a] border border-[#222] ${prefersReducedMotion ? '' : 'modal-jitter'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Media - optimized for smooth playback */}
            <div className="flex flex-col">
              <div className="relative aspect-square bg-[#111]" style={{ willChange: 'contents' }}>
                {isVideo ? (
                  <video
                    key={currentDaily.id}
                    src={resolveDailyMediaUrl(currentDaily.imageUrl)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-contain"
                    style={{ willChange: 'transform' }}
                  />
                ) : (
                  <img
                    key={currentDaily.id}
                    src={resolveDailyMediaUrl(currentDaily.imageUrl)}
                    alt={currentDaily.id}
                    className="w-full h-full object-contain"
                    loading="eager"
                    decoding="sync"
                    style={{ 
                      willChange: 'transform',
                      imageRendering: currentDaily.imageUrl.endsWith('.gif') ? 'auto' : 'auto',
                    }}
                    onError={(e) => {
                      console.error('Image failed to load:', resolveDailyMediaUrl(currentDaily.imageUrl), e)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                )}
              </div>
              
              {/* Twitter Share Button */}
              <a
                href={generateTwitterShareUrl({
                  title: currentDaily.id.replace(/_/g, ' ').toUpperCase(),
                  date: currentDaily.savedDate,
                  imageUrl: resolveDailyMediaUrl(currentDaily.imageUrl),
                  url: typeof window !== 'undefined' ? window.location.href : '',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 px-2 py-1 text-center font-grotesk font-light bg-[#111] text-[#999] border border-[#222] hover:border-[#333] hover:text-white transition-colors mono text-[9px]"
              >
                SHARE TO TWITTER
              </a>
            </div>

            {/* Metadata */}
            <div className="flex flex-col">
              <div className="mono text-[10px] text-[#666] mb-3 tracking-wider terminal-reveal text-hover-glitch">
                [ARTWORK_INFO]
              </div>
              
              <h2 className="font-grotesk text-2xl md:text-3xl font-light mb-6 tracking-tighter terminal-reveal text-hover-glitch">
                {currentDaily.id.replace(/_/g, ' ').toUpperCase()}
              </h2>
              
              <div className="space-y-4 mb-8 mono text-xs">
                <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                  <span className="text-[#666] min-w-[60px] text-hover-glitch">DATE:</span>
                  <span className="text-[#999] terminal-reveal">
                    {new Date(currentDaily.savedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }).toUpperCase()}
                  </span>
                </div>

                <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                  <span className="text-[#666] min-w-[60px] text-hover-glitch">STATUS:</span>
                  <span className="text-[#999] flex items-center gap-2 terminal-reveal">
                    <span className={`w-2 h-2 block ${currentDaily.status === 'available' ? 'bg-[#4a4]' : 'bg-[#666]'}`} />
                    {currentDaily.status.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                {currentDaily.tags.length > 0 && (
                  <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                    <span className="text-[#666] min-w-[60px] text-hover-glitch">TAGS:</span>
                    <div className="flex flex-wrap gap-2">
                      {currentDaily.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-[#666] border border-[#222] terminal-reveal text-hover-glitch"
                        >
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Collect CTA - Note: transientLabsUrl would need to be added to DailyArtwork type */}
              {currentDaily.status === 'available' && (
                <div className="mt-auto px-6 py-3 text-center font-grotesk font-light bg-[#111] text-[#999] border border-[#222]">
                  STATUS: AVAILABLE
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
