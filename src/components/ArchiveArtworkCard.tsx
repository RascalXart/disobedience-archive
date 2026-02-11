'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { DailyArtwork } from '@/types'
import { DailyArtworkModal } from './DailyArtworkModal'
import { getAllDailies, resolveDailyMediaUrl } from '@/lib/data'

interface ArchiveArtworkCardProps {
  daily: DailyArtwork
  index: number
}

export function ArchiveArtworkCard({ daily, index }: ArchiveArtworkCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const allDailies = getAllDailies()

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

  // Standardized size - consistent width
  const sizeClass = 'w-full'
  
  // Subtle staggered positioning for visual interest
  const offsetVariants = [
    'md:ml-0',
    'md:ml-[4%]',
    'md:ml-[2%]',
    'md:ml-[6%]',
    'md:ml-0',
  ]
  const offsetClass = offsetVariants[index % offsetVariants.length]

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isVisible ? 1 : 0.3, y: isVisible ? 0 : 20 }}
        transition={{ 
          delay: index * 0.02,
          duration: 0.6,
          ease: [0.25, 0.1, 0.25, 1]
        }}
        className={`${sizeClass} ${offsetClass} mb-8 md:mb-16`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className="group cursor-pointer relative"
          onClick={() => setIsModalOpen(true)}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.3 }}
        >
          {/* Image container - standardized square aspect ratio */}
          <div className="relative overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors aspect-square">
            {daily.imageUrl.includes('.mp4') || daily.imageUrl.includes('.mov') ? (
              shouldLoad ? (
              <video
                  ref={videoRef}
                  src={resolveDailyMediaUrl(daily.imageUrl)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  autoPlay={isVisible}
                muted
                loop
                playsInline
                  preload="none"
              />
              ) : (
                <div className="w-full h-full bg-[#111]" />
              )
            ) : (
              shouldLoad ? (
                <img
                  src={resolveDailyMediaUrl(daily.imageUrl)}
                alt={daily.id}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="eager"
                  onError={(e) => {
                    console.error('Image failed to load:', resolveDailyMediaUrl(daily.imageUrl), e)
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
              />
              ) : (
                <div className="w-full h-full bg-[#111]" />
              )
            )}
            <div className="absolute inset-0 bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/20 transition-colors" />
            
            {/* Hover reveal: savedDate */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a]/95 to-transparent"
            >
              <div className="mono text-xs text-[#666] terminal-reveal text-hover-glitch">
                {new Date(daily.savedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }).toUpperCase()}
              </div>
            </motion.div>
          </div>

          {/* ID label */}
          <div className="mt-3">
            <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors text-hover-glitch">
              {daily.id.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {isModalOpen && (
        <DailyArtworkModal daily={daily} allDailies={allDailies} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}

