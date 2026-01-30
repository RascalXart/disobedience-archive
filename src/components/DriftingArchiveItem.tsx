'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { DailyArtwork } from '@/types'
import { resolveDailyMediaUrl } from '@/lib/data'

interface DriftingArchiveItemProps {
  daily: DailyArtwork
  index: number
  size: 'small' | 'medium' | 'large'
  onOpenModal: (daily: DailyArtwork) => void
}

export function DriftingArchiveItem({ daily, index, size, onOpenModal }: DriftingArchiveItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
    }
  }, [])

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

  useEffect(() => {
    if (isHovered) {
      setShowLabel(true)
    } else {
      const timer = setTimeout(() => setShowLabel(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isHovered])

  const sizeClasses = {
    small: 'w-full md:w-[45%]',
    medium: 'w-full md:w-[55%]',
    large: 'w-full md:w-[65%]',
  }

  const sizeHeights = {
    small: 'aspect-square',
    medium: 'aspect-[4/3]',
    large: 'aspect-[3/2]',
  }

  const offsetVariants = [
    { x: 0, y: 0 },
    { x: 8, y: -4 },
    { x: -6, y: 4 },
    { x: 4, y: -2 },
    { x: -8, y: 6 },
  ]
  const offset = offsetVariants[index % offsetVariants.length]

  const isVideo = daily.imageUrl.endsWith('.mp4') || daily.imageUrl.endsWith('.mov')
  const mediaUrl = resolveDailyMediaUrl(daily.imageUrl)

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0.3, y: isVisible ? 0 : 20 }}
      transition={{ 
        delay: index * 0.03,
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={`${sizeClasses[size]} mb-6 md:mb-12 group cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenModal(daily)}
      style={{
        transform: prefersReducedMotion ? 'none' : `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {/* Image container - no borders, no cards */}
      <div className={`relative overflow-hidden bg-[#111] ${sizeHeights[size]}`}>
        {isVideo ? (
          shouldLoad ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-cover"
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
              src={mediaUrl}
              alt={daily.id}
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                console.error('Image failed to load:', mediaUrl, e)
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#111]" />
          )
        )}

        {/* Hover overlay with chromatic aberration effect */}
        {isVisible && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={isHovered ? {
              opacity: [0, 0.1, 0],
              filter: prefersReducedMotion ? 'none' : [
                'brightness(1)',
                'brightness(1.1) contrast(1.05)',
                'brightness(1)',
              ],
            } : {}}
            transition={{ duration: 0.3 }}
            style={{
              background: prefersReducedMotion ? 'none' : 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.1) 50%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Label reveal with glitch effect */}
        {showLabel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-sm"
          >
            <motion.div
              className="mono text-[10px] text-[#999] leading-tight"
              animate={prefersReducedMotion ? {} : {
                opacity: [1, 0.7, 1, 0.8, 1],
                x: [0, -0.5, 0.5, -0.3, 0],
              }}
              transition={{
                duration: 0.3,
                times: [0, 0.2, 0.4, 0.6, 1],
              }}
            >
              <div className="mb-1">
                {new Date(daily.savedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className="text-[#666] text-[9px]">
                {daily.id.replace(/_/g, ' ').toUpperCase()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

