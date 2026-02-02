'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useEffect } from 'react'
import type { Artwork } from '@/types'
import { generateTwitterShareUrl } from '@/lib/twitter-share'

interface ArtworkModalProps {
  artwork: Artwork
  onClose: () => void
}

export function ArtworkModal({ artwork, onClose }: ArtworkModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

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
              
              {/* Twitter Share Button */}
              <a
                href={generateTwitterShareUrl({
                  title: artwork.title,
                  date: artwork.date,
                  tokenId: artwork.tokenId || undefined,
                  imageUrl: artwork.imageUrl,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 px-2 py-1 text-center font-grotesk font-light bg-[#111] text-[#999] border border-[#222] hover:border-[#333] hover:text-white transition-colors mono text-[9px]"
              >
                SHARE TO TWITTER
              </a>
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
      </motion.div>
    </AnimatePresence>
  )
}
