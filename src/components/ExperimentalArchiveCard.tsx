'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { DailyArtwork } from '@/types'
import { resolveDailyMediaUrl } from '@/lib/data'

interface ExperimentalArchiveCardProps {
  daily: DailyArtwork
  index: number
  onClick?: () => void
  mouseX: number
  mouseY: number
  isModalOpen?: boolean
}

export function ExperimentalArchiveCard({ daily, index, onClick, mouseX, mouseY, isModalOpen = false }: ExperimentalArchiveCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Random glitch intervals
  useEffect(() => {
    if (!isVisible) return
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 200)
      }
    }, 3000 + Math.random() * 5000)

    return () => clearInterval(interval)
  }, [isVisible])

  // Intersection observer for visibility - only load images/videos when in viewport
  const videoRef = useRef<HTMLVideoElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting
          setIsVisible(isIntersecting)
          
          // Only start loading when in viewport (or about to be)
          // Once loaded, keep it loaded (don't unload)
          if (isIntersecting && !shouldLoad && !hasLoaded) {
            setShouldLoad(true)
          }
          
          // Pause/play video based on visibility
          if (videoRef.current) {
            if (isIntersecting) {
              videoRef.current.play().catch(() => {
                // Ignore autoplay errors
              })
            } else {
              videoRef.current.pause()
            }
          }
        })
      },
      { rootMargin: '50px', threshold: 0.01 } // Start loading 50px before entering viewport (reduced for better prioritization)
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [shouldLoad, hasLoaded])


  const isVideo = daily.imageUrl.endsWith('.mp4') || daily.imageUrl.endsWith('.mov')
  const mediaUrl = resolveDailyMediaUrl(daily.imageUrl)
  
  // Consistent sizing - no weird cropping
  const size = { w: 'w-full', h: 'aspect-square' }

  // Subtle offsets only
  const offsetX = 0
  const offsetY = 0
  
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1,
        scale: 1,
      }}
      transition={{ 
        delay: index * 0.02,
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={`${size.w} mb-8 md:mb-12 group cursor-pointer relative`}
      onClick={onClick}
    >
      {/* Glitch overlay */}
      {isVisible && glitchActive && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.3, 0, 0.2, 0],
            x: [-2, 2, -1, 1, 0],
            y: [2, -2, 1, -1, 0],
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-full h-full bg-gradient-to-r from-red-500/20 via-green-500/20 to-blue-500/20 mix-blend-screen" />
        </motion.div>
      )}

      {/* Main container with distortion */}
      <div
        className={`relative ${size.h} overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#444] transition-all duration-500 artwork-hover-glitch ${glitchActive && isVisible ? 'data-corrupt' : ''} group-hover:scale-[1.02] group-hover:brightness-110`}
        style={{
          opacity: isVisible ? 1 : 0.3,
        }}
      >
        {isVideo ? (
          shouldLoad ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] group-hover:brightness-110"
              autoPlay={isVisible && !isModalOpen}
              muted
              loop
              playsInline
              preload="none"
              onError={(e) => {
                console.error('Video failed to load:', mediaUrl, e)
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#111]" />
          )
        ) : (
          <div className="w-full h-full relative">
            {shouldLoad || hasLoaded ? (
              <img
                ref={imgRef}
                src={mediaUrl}
                alt={daily.id}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] group-hover:brightness-110"
                loading="eager"
                decoding="async"
                style={{
                  willChange: isModalOpen ? 'auto' : 'transform',
                  opacity: isModalOpen ? 0.3 : 1,
                  filter: isModalOpen ? 'blur(2px)' : 'none',
                }}
                onLoad={() => {
                  setHasLoaded(true)
                }}
                onError={(e) => {
                  console.error('Image failed to load:', mediaUrl, e)
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full bg-[#111]" />
            )}
          </div>
        )}

        {/* Chromatic aberration overlay on hover */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.1) 25%, rgba(0,255,0,0.1) 50%, rgba(0,0,255,0.1) 75%, transparent 100%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Corrupted data overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
            mixBlendMode: 'difference',
          }}
        />

        {/* Label reveal with glitch text and reflections */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#0a0a0a]/98 backdrop-blur-md border-t border-[#333] relative opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Text reflection layers */}
            <motion.div
              className="absolute bottom-3 left-3 text-[#999]/10 blur-[1px] translate-y-[2px] scale-y-[-1] select-none pointer-events-none mono text-[9px] leading-tight"
              animate={glitchActive ? {
                x: [-1, 1, -0.5, 0.5, 0],
                opacity: [0.1, 0.05, 0.1, 0.08, 0.1],
              } : {}}
            >
              <div className="mb-1">
                {new Date(daily.savedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className="text-[#666] text-[8px]">
                {daily.id.replace(/_/g, ' ').toUpperCase()}
              </div>
            </motion.div>
            <motion.div
              className="absolute bottom-3 left-3 text-green-500/15 blur-[0.5px] translate-x-[1px] select-none pointer-events-none mono text-[9px] leading-tight"
              animate={glitchActive ? {
                x: [-0.5, 0.5, -0.3, 0.3, 0],
                opacity: [0.15, 0.1, 0.15, 0.12, 0.15],
              } : {}}
            >
              <div className="mb-1">
                {new Date(daily.savedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className="text-[#666] text-[8px]">
                {daily.id.replace(/_/g, ' ').toUpperCase()}
              </div>
            </motion.div>
            <motion.div
              className="mono text-[9px] text-[#999] leading-tight relative corrupt-text terminal-reveal"
              animate={glitchActive ? {
                x: [-1, 1, -0.5, 0.5, 0],
                opacity: [1, 0.7, 1, 0.8, 1],
              } : {}}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-1 flicker rgb-split text-hover-glitch">
                {new Date(daily.savedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className="text-[#666] text-[8px] text-hover-glitch">
                {daily.id.replace(/_/g, ' ').toUpperCase()}
              </div>
            </motion.div>
        </div>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
          <div className="w-full h-full" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          }} />
        </div>
      </div>

      {/* Distortion shadow */}
      <div className="absolute inset-0 -z-10 bg-[#000] opacity-0 group-hover:opacity-20 group-hover:scale-125 blur-xl transition-all duration-300" />
    </motion.div>
  )
}

