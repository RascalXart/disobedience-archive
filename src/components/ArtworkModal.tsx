'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import type { Artwork } from '@/types'
import { generateTwitterShareUrl } from '@/lib/twitter-share'

interface ArtworkModalProps {
  artwork: Artwork
  onClose: () => void
}

export function ArtworkModal({ artwork, onClose }: ArtworkModalProps) {
  const [heroOpen, setHeroOpen] = useState(false)
  const [showHeroMeta, setShowHeroMeta] = useState(false)
  const heroMetaStillRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (heroOpen) setHeroOpen(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose, heroOpen])

  useEffect(() => {
    if (heroOpen) setShowHeroMeta(false)
    if (!heroOpen && heroMetaStillRef.current) {
      clearTimeout(heroMetaStillRef.current)
      heroMetaStillRef.current = null
    }
  }, [heroOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/95 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative w-full max-w-6xl max-h-[90vh] overflow-auto bg-[#0a0a0a] border border-[#222]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-[#222] transition-colors mono text-xs text-[#666] hover:text-white"
            aria-label="Close modal"
          >
            [CLOSE]
          </button>

          <div className="grid md:grid-cols-2 gap-8 p-8">
            <div className="flex flex-col">
              <div className="relative aspect-square bg-[#111] border border-[#222]">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
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
                    title: artwork.title,
                    date: artwork.date,
                    tokenId: artwork.tokenId || undefined,
                    imageUrl: artwork.imageUrl,
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

            <div className="flex flex-col">
              <div className="mono text-xs text-[#666] mb-2 tracking-wider">
                [ARTWORK_INFO]
              </div>

              <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-6 tracking-tighter">
                {artwork.title}
              </h2>

              <div className="space-y-4 mb-8 mono text-xs">
                <div className="flex items-start gap-4 border-b border-[#222] pb-4">
                  <span className="text-[#666] min-w-[80px]">DATE:</span>
                  <span className="text-[#999]">
                    {new Date(artwork.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }).toUpperCase()}
                  </span>
                </div>

                <div className="flex items-start gap-4 border-b border-[#222] pb-4">
                  <span className="text-[#666] min-w-[80px]">STATUS:</span>
                  <span className="text-[#999] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      artwork.status === 'available' ? 'bg-[#4a4]' :
                      artwork.status === 'sold' ? 'bg-[#666]' :
                      'bg-[#666]'
                    }`} />
                    {artwork.status.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                {artwork.minted && artwork.tokenId && (
                  <div className="flex items-start gap-4 border-b border-[#222] pb-4">
                    <span className="text-[#666] min-w-[80px]">TOKEN:</span>
                    <span className="text-[#999]">#{artwork.tokenId}</span>
                  </div>
                )}

                {artwork.tags.length > 0 && (
                  <div className="flex items-start gap-4 border-b border-[#222] pb-4">
                    <span className="text-[#666] min-w-[80px]">TAGS:</span>
                    <div className="flex flex-wrap gap-2">
                      {artwork.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-[#666] border border-[#222] hover:border-[#333] transition-colors"
                        >
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {artwork.transientLabsUrl && (
                <a
                  href={artwork.transientLabsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-auto px-6 py-3 text-center font-grotesk font-light transition-all ${
                    artwork.status === 'available'
                      ? 'bg-white text-[#0a0a0a] hover:bg-[#f5f5f5] hover:glitch'
                      : 'bg-[#111] text-[#999] border border-[#222] hover:border-[#333]'
                  }`}
                >
                  {artwork.status === 'available'
                    ? 'ACQUIRE ON TRANSIENT LABS'
                    : 'VIEW ON TRANSIENT LABS'}
                </a>
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
              <div className={`w-full h-full min-w-0 min-h-0 max-w-full max-h-full transition-opacity duration-200 ${showHeroMeta ? 'opacity-40' : 'opacity-100'}`}>
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              <div className={`absolute inset-0 flex items-center justify-center bg-black/70 transition-opacity duration-200 pointer-events-none p-8 ${showHeroMeta ? 'opacity-100' : 'opacity-0'}`}>
                <div className="mono text-left text-sm text-[#ccc] space-y-3 max-w-md">
                  <div className="font-grotesk text-white text-xl font-light tracking-tighter">{artwork.title}</div>
                  <div><span className="text-[#666]">DATE:</span> {new Date(artwork.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</div>
                  <div><span className="text-[#666]">STATUS:</span> {artwork.status.toUpperCase().replace('_', ' ')}</div>
                  {artwork.tags.length > 0 && (
                    <div><span className="text-[#666]">TAGS:</span> {artwork.tags.map(t => t.toUpperCase()).join(', ')}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-[#222] bg-[#0a0a0a] px-4 py-3 text-center">
              <div className="font-grotesk text-white font-light tracking-tighter">{artwork.title}</div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
