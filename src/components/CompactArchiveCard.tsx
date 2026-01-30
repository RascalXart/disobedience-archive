'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { DailyArtwork } from '@/types'
import { resolveDailyMediaUrl } from '@/lib/data'

interface CompactArchiveCardProps {
  daily: DailyArtwork
  index: number
  onClick?: () => void
}

export function CompactArchiveCard({ daily, index, onClick }: CompactArchiveCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Intersection observer for viewport visibility - only load when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting
          setIsVisible(isIntersecting)
          
          // Only load media when actually visible
          if (isIntersecting && !shouldLoad) {
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
      { rootMargin: '200px', threshold: 0.01 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [shouldLoad])

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: isVisible ? 1 : 0.3, scale: isVisible ? 1 : 0.98 }}
      transition={{ 
        delay: index * 0.008,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className="group cursor-pointer relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
        {/* Museum placard-style container */}
        <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-all duration-500">
          {daily.imageUrl.endsWith('.mp4') || daily.imageUrl.endsWith('.mov') ? (
            shouldLoad ? (
              <motion.video
                ref={videoRef}
                src={resolveDailyMediaUrl(daily.imageUrl)}
                className="w-full h-full object-contain"
                autoPlay={isVisible}
                muted
                loop
                playsInline
                preload="none"
                animate={isVisible ? {
                  scale: isHovered ? 1.02 : 1,
                  filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
                } : {}}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              />
            ) : (
              <div className="w-full h-full bg-[#111]" />
            )
          ) : (
            <motion.div
              animate={isVisible ? {
                scale: isHovered ? 1.05 : 1,
                filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
              } : {}}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full h-full relative"
            >
              {shouldLoad ? (
                <img
                  src={resolveDailyMediaUrl(daily.imageUrl)}
                  alt={daily.id}
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    console.error('Image failed to load:', resolveDailyMediaUrl(daily.imageUrl), e)
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#111]" />
              )}
            </motion.div>
          )}
          
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Museum placard info - appears on hover */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ 
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 8,
            }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute bottom-0 left-0 right-0 p-2 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-[#222]"
          >
            <div className="mono text-[9px] text-[#999] leading-tight">
              <div className="mb-0.5">
                {new Date(daily.savedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className="text-[#666] text-[8px]">
                {daily.id.replace(/_/g, ' ').toUpperCase()}
              </div>
            </div>
          </motion.div>

          {/* Micro-glitch effect on hover */}
          {isVisible && isHovered && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                x: [0, -0.5, 0.5, -0.3, 0.3, 0],
                opacity: [0, 0.03, 0, 0.02, 0, 0],
              }}
              transition={{
                duration: 0.3,
                times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              }}
            >
              <div className="w-full h-full bg-white" />
            </motion.div>
          )}
        </div>

        {/* Subtle drift animation container */}
        {isVisible && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={isHovered ? {
              x: [0, 0.3, -0.2, 0.2, -0.1, 0],
              y: [0, -0.2, 0.3, -0.1, 0.2, 0],
            } : {}}
            transition={{
              duration: 4,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        )}
      </motion.div>
  )
}
