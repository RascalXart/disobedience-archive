'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DailyArtwork } from '@/types'
import { resolveDailyMediaUrl } from '@/lib/data'
import { generateTwitterShareUrl } from '@/lib/twitter-share'
import { ModalNavArrows } from '@/components/ModalNavArrows'
import { resolveENSCached } from '@/lib/ens-cache'

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface DailyArtworkModalProps {
  daily: DailyArtwork
  allDailies: DailyArtwork[]
  onClose: () => void
}

export function DailyArtworkModal({ daily, allDailies, onClose }: DailyArtworkModalProps) {
  const initialIndex = allDailies.findIndex(d => d.id === daily.id)
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0)
  const [heroOpen, setHeroOpen] = useState(false)
  const [showHeroMeta, setShowHeroMeta] = useState(false)
  const [ownerENS, setOwnerENS] = useState<string | null>(null)
  const [modalMediaLoaded, setModalMediaLoaded] = useState(false)
  const [heroMediaLoaded, setHeroMediaLoaded] = useState(false)
  const [modalMediaError, setModalMediaError] = useState(false)
  const [heroMediaError, setHeroMediaError] = useState(false)
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const [heroThumbnailFailed, setHeroThumbnailFailed] = useState(false)
  const heroMetaStillRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const currentDaily = allDailies[currentIndex] ?? daily
  const thumbnailSrc = `/thumbs/${currentDaily.id}.webp`

  useEffect(() => {
    setModalMediaLoaded(false)
    setHeroMediaLoaded(false)
    setModalMediaError(false)
    setHeroMediaError(false)
    setThumbnailFailed(false)
    setHeroThumbnailFailed(false)
  }, [currentDaily.id])

  useEffect(() => {
    const idx = allDailies.findIndex((d) => d.id === daily.id)
    setCurrentIndex(idx >= 0 ? idx : 0)
  }, [daily.id, allDailies])

  const navigatePrevious = useCallback(() => {
    setCurrentIndex((idx) => Math.max(0, idx - 1))
  }, [])

  const navigateNext = useCallback(() => {
    setCurrentIndex((idx) => Math.min(allDailies.length - 1, idx + 1))
  }, [allDailies.length])

  useEffect(() => {
    if (heroOpen) setShowHeroMeta(false)
    if (!heroOpen && heroMetaStillRef.current) {
      clearTimeout(heroMetaStillRef.current)
      heroMetaStillRef.current = null
    }
  }, [heroOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (heroOpen) setHeroOpen(false)
        else onClose()
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigatePrevious() }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateNext() }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = 'unset'
    }
  }, [navigatePrevious, navigateNext, onClose, heroOpen])

  // Resolve ENS for minted token owner
  useEffect(() => {
    setOwnerENS(null)
    if (!currentDaily.owner) return
    let cancelled = false
    resolveENSCached(currentDaily.owner).then(name => {
      if (!cancelled) setOwnerENS(name)
    })
    return () => { cancelled = true }
  }, [currentDaily.owner])

  const ownerDisplay = ownerENS || (currentDaily.owner ? shortenAddress(currentDaily.owner) : null)
  const openSeaUrl = currentDaily.owner
    ? `https://opensea.io/${ownerENS?.replace('.eth', '') || currentDaily.owner}`
    : null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const isVideo = currentDaily.imageUrl.includes('.mp4') || currentDaily.imageUrl.includes('.mov')

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]"
        onClick={handleBackdropClick}
      >
        <ModalNavArrows
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < allDailies.length - 1}
          onPrev={navigatePrevious}
          onNext={navigateNext}
        />

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
                {!thumbnailFailed && !modalMediaLoaded && (
                  <img
                    src={thumbnailSrc}
                    alt={`${currentDaily.id} thumbnail`}
                    className="absolute inset-0 w-full h-full object-contain"
                    loading="eager"
                    decoding="async"
                    onError={() => setThumbnailFailed(true)}
                  />
                )}
                {isVideo ? (
                  <video
                    key={currentDaily.id}
                    src={resolveDailyMediaUrl(currentDaily.imageUrl)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className={`relative z-[1] w-full h-full object-contain transition-opacity duration-300 ${modalMediaLoaded && !modalMediaError ? 'opacity-100' : 'opacity-0'}`}
                    style={{ willChange: 'transform' }}
                    onLoadedData={() => {
                      setModalMediaError(false)
                      setModalMediaLoaded(true)
                    }}
                    onError={() => {
                      setModalMediaError(true)
                      setModalMediaLoaded(false)
                    }}
                  />
                ) : (
                  <img
                    key={currentDaily.id}
                    src={resolveDailyMediaUrl(currentDaily.imageUrl)}
                    alt={currentDaily.id}
                    className={`relative z-[1] w-full h-full object-contain transition-opacity duration-300 ${modalMediaLoaded && !modalMediaError ? 'opacity-100' : 'opacity-0'}`}
                    loading="eager"
                    decoding="sync"
                    style={{ 
                      willChange: 'transform',
                      imageRendering: currentDaily.imageUrl.includes('.gif') ? 'auto' : 'auto',
                    }}
                    onLoad={() => {
                      setModalMediaError(false)
                      setModalMediaLoaded(true)
                    }}
                    onError={(e) => {
                      setModalMediaError(true)
                      setModalMediaLoaded(false)
                      console.error('Image failed to load:', resolveDailyMediaUrl(currentDaily.imageUrl), e)
                    }}
                  />
                )}
                {!modalMediaLoaded && !modalMediaError && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/80 pointer-events-none">
                    <div className="w-7 h-7 border border-[#666] border-t-white animate-spin" />
                    <div className="mono text-[10px] tracking-wider text-[#aaa]">[LOADING_FULL_RES]</div>
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setHeroOpen(true)}
                  className="flex-1 mono text-[9px] px-2 py-1 border border-[#222] hover:border-[#444] text-[#999] hover:text-white transition-colors"
                >
                  [FULL SCREEN]
                </button>
                <a
                  href={generateTwitterShareUrl({
                    title: (currentDaily.title || currentDaily.id.replace(/_/g, ' ')).toUpperCase(),
                    date: currentDaily.savedDate,
                    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/daily/share/${currentDaily.id}`,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 mono text-[9px] px-2 py-1 border border-[#222] hover:border-[#444] text-[#999] hover:text-white transition-colors text-center"
                >
                  <svg className="inline-block w-3 h-3 mr-1 -mt-px" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  SHARE
                </a>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-col">
              <div className="mono text-[10px] text-[#666] mb-3 tracking-wider terminal-reveal text-hover-glitch">
                [ARTWORK_INFO]
              </div>
              
              <h2 className="font-grotesk text-2xl md:text-3xl font-light tracking-tighter terminal-reveal text-hover-glitch">
                {(currentDaily.title || currentDaily.id.replace(/_/g, ' ')).toUpperCase()}
              </h2>
              {currentDaily.title && (
                <div className="mono text-[10px] text-[#555] mt-1 mb-6 terminal-reveal">{currentDaily.id.replace(/_/g, ' ').toUpperCase()}</div>
              )}
              {!currentDaily.title && <div className="mb-6" />}
              
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
                  <span className="text-[#666] min-w-[60px] text-hover-glitch">FILE TYPE:</span>
                  <span className="text-[#999] terminal-reveal">
                    {(() => { const p = (currentDaily.imageUrl?.split('?')[0] || ''); return p.includes('.') ? p.split('.').pop()?.toUpperCase() ?? '—' : '—' })()}
                  </span>
                </div>

                <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                  <span className="text-[#666] min-w-[60px] text-hover-glitch">STATUS:</span>
                  <span className="text-[#999] flex items-center gap-2 terminal-reveal">
                    <span className={`w-2 h-2 block ${currentDaily.minted ? 'bg-[#c9a84c]' : currentDaily.status === 'available' ? 'bg-[#4a4]' : 'bg-[#666]'}`} />
                    {currentDaily.minted ? 'MINTED' : currentDaily.status === 'not_listed' ? 'NOT MINTED' : currentDaily.status.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                {currentDaily.minted && ownerDisplay && (
                  <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                    <span className="text-[#666] min-w-[60px] text-hover-glitch">OWNER:</span>
                    <a
                      href={openSeaUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c9a84c] hover:text-white transition-colors terminal-reveal"
                    >
                      {ownerDisplay}
                    </a>
                  </div>
                )}

                {currentDaily.minted && currentDaily.tokenId != null && (
                  <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                    <span className="text-[#666] min-w-[60px] text-hover-glitch">TOKEN:</span>
                    <a
                      href={`https://opensea.io/assets/ethereum/${currentDaily.contractAddress}/${currentDaily.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c9a84c] hover:text-white transition-colors terminal-reveal"
                    >
                      RASCAL EVERYDAYS #{currentDaily.tokenId}
                    </a>
                  </div>
                )}

                {currentDaily.description && (
                  <div className="flex items-start gap-4 border-b border-[#222] pb-4 terminal-reveal">
                    <span className="text-[#666] min-w-[60px] text-hover-glitch">INFO:</span>
                    <span className="text-[#999] terminal-reveal">{currentDaily.description}</span>
                  </div>
                )}

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

              {currentDaily.status === 'available' && (
                <div className="mt-auto px-6 py-3 text-center font-grotesk font-light bg-[#111] text-[#999] border border-[#222]">
                  STATUS: AVAILABLE
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Hero fullscreen overlay */}
        {heroOpen && (
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a] min-w-0 min-h-0 overflow-hidden"
            onClick={(e) => { e.stopPropagation(); setHeroOpen(false) }}
          >
            <ModalNavArrows
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < allDailies.length - 1}
              onPrev={() => { navigatePrevious() }}
              onNext={() => { navigateNext() }}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setHeroOpen(false) }}
              className="absolute top-4 right-4 z-10 mono text-xs text-[#666] hover:text-white px-2 py-1 border border-[#222] bg-[#111]"
            >
              [CLOSE]
            </button>
            <div
              className="flex-1 min-h-0 flex items-center justify-center p-4 relative"
              onClick={(e) => e.stopPropagation()}
              onMouseMove={() => {
                setShowHeroMeta(true)
                if (heroMetaStillRef.current) clearTimeout(heroMetaStillRef.current)
                heroMetaStillRef.current = setTimeout(() => setShowHeroMeta(false), 80)
              }}
              onTouchStart={() => setShowHeroMeta(true)}
              onTouchEnd={() => setShowHeroMeta(false)}
            >
              <div className={`relative w-full h-full min-w-0 min-h-0 max-w-full max-h-full transition-opacity duration-200 ${showHeroMeta ? 'opacity-40' : 'opacity-100'}`}>
                {!heroThumbnailFailed && !heroMediaLoaded && (
                  <img
                    src={thumbnailSrc}
                    alt={`${currentDaily.id} thumbnail`}
                    className="absolute inset-0 w-full h-full object-contain"
                    loading="eager"
                    decoding="async"
                    onError={() => setHeroThumbnailFailed(true)}
                  />
                )}
                {isVideo ? (
                  <video
                    key={currentDaily.id}
                    src={resolveDailyMediaUrl(currentDaily.imageUrl)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`relative z-[1] w-full h-full object-contain transition-opacity duration-300 ${heroMediaLoaded && !heroMediaError ? 'opacity-100' : 'opacity-0'}`}
                    onLoadedData={() => {
                      setHeroMediaError(false)
                      setHeroMediaLoaded(true)
                    }}
                    onError={() => {
                      setHeroMediaError(true)
                      setHeroMediaLoaded(false)
                    }}
                  />
                ) : (
                  <img
                    key={currentDaily.id}
                    src={resolveDailyMediaUrl(currentDaily.imageUrl)}
                    alt={currentDaily.id}
                    className={`relative z-[1] w-full h-full object-contain transition-opacity duration-300 ${heroMediaLoaded && !heroMediaError ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => {
                      setHeroMediaError(false)
                      setHeroMediaLoaded(true)
                    }}
                    onError={() => {
                      setHeroMediaError(true)
                      setHeroMediaLoaded(false)
                    }}
                  />
                )}
                {!heroMediaLoaded && !heroMediaError && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/80 pointer-events-none">
                    <div className="w-7 h-7 border border-[#666] border-t-white animate-spin" />
                    <div className="mono text-[10px] tracking-wider text-[#aaa]">[LOADING_FULL_RES]</div>
                  </div>
                )}
              </div>
              <div className={`absolute inset-0 flex items-center justify-center bg-black/70 transition-opacity duration-200 pointer-events-none p-8 ${showHeroMeta ? 'opacity-100' : 'opacity-0'}`}>
                <div className="mono text-left text-sm text-[#ccc] space-y-3 max-w-md">
                  <div className="font-grotesk text-white text-xl font-light tracking-tighter">
                    {(currentDaily.title || currentDaily.id.replace(/_/g, ' ')).toUpperCase()}
                  </div>
                  {currentDaily.title && (
                    <div className="text-[#666] text-xs">{currentDaily.id.replace(/_/g, ' ').toUpperCase()}</div>
                  )}
                  <div><span className="text-[#666]">DATE:</span> {new Date(currentDaily.savedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</div>
                  <div><span className="text-[#666]">FILE TYPE:</span> {(() => { const p = (currentDaily.imageUrl?.split('?')[0] || ''); return p.includes('.') ? p.split('.').pop()?.toUpperCase() ?? '—' : '—' })()}</div>
                  <div><span className="text-[#666]">STATUS:</span> {currentDaily.minted ? 'MINTED' : currentDaily.status === 'not_listed' ? 'NOT MINTED' : currentDaily.status.toUpperCase().replace('_', ' ')}</div>
                  {currentDaily.minted && ownerDisplay && (
                    <div><span className="text-[#666]">OWNER:</span> {ownerDisplay}</div>
                  )}
                  {currentDaily.tags.length > 0 && (
                    <div><span className="text-[#666]">TAGS:</span> {currentDaily.tags.map(t => t.toUpperCase()).join(', ')}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-[#222] bg-[#0a0a0a] px-4 py-3 text-center">
              <div className="font-grotesk text-white font-light tracking-tighter">
                {(currentDaily.title || currentDaily.id.replace(/_/g, ' ')).toUpperCase()}
              </div>
              <div className="mono text-xs text-[#666] mt-0.5">{currentDaily.title ? currentDaily.id.replace(/_/g, ' ').toUpperCase() : '—'}</div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
