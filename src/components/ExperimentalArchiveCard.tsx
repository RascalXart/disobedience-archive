'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { DailyArtwork } from '@/types'

interface ExperimentalArchiveCardProps {
  daily: DailyArtwork
  index: number
  onClick?: () => void
  mouseX: number
  mouseY: number
}

export function ExperimentalArchiveCard({ daily, index, onClick, mouseX, mouseY }: ExperimentalArchiveCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Mouse tracking for parallax/distortion
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateXValue = useTransform(y, [-0.5, 0.5], [5, -5])
  const rotateYValue = useTransform(x, [-0.5, 0.5], [-5, 5])
  const rotateX = useSpring(rotateXValue, { stiffness: 300, damping: 30 })
  const rotateY = useSpring(rotateYValue, { stiffness: 300, damping: 30 })
  
  const translateX = useTransform(x, [-0.5, 0.5], [-10, 10])
  const translateY = useTransform(y, [-0.5, 0.5], [-10, 10])
  const shadowX = useTransform(x, [-0.5, 0.5], [-20, 20])
  const shadowY = useTransform(y, [-0.5, 0.5], [-20, 20])

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

  // Intersection observer for visibility - start visible to avoid blank squares
  useEffect(() => {
    // Set visible immediately for better UX
    setIsVisible(true)
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { rootMargin: '500px', threshold: 0.01 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Mouse position tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = (e.clientX - centerX) / rect.width
      const deltaY = (e.clientY - centerY) / rect.height
      x.set(deltaX)
      y.set(deltaY)
    }

    if (isHovered) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isHovered, x, y])

  const isVideo = daily.imageUrl.endsWith('.mp4') || daily.imageUrl.endsWith('.mov')
  
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
      style={{
        x: isHovered ? translateX : offsetX,
        y: isHovered ? translateY : offsetY,
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        x.set(0)
        y.set(0)
      }}
      onClick={onClick}
    >
      {/* Glitch overlay */}
      {glitchActive && (
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
      <motion.div
        className={`relative ${size.h} overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#444] transition-all duration-500 ${glitchActive ? 'data-corrupt' : ''}`}
        animate={isHovered ? {
          scale: 1.02,
          filter: 'brightness(1.15) contrast(1.1) saturate(1.2)',
        } : {}}
        style={{
          transform: isHovered ? 'perspective(1000px)' : 'none',
        }}
      >
        {isVideo ? (
          <motion.video
            src={daily.imageUrl}
            className="w-full h-full object-contain"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={(e) => {
              console.error('Video failed to load:', daily.imageUrl, e)
            }}
            animate={isHovered ? {
              scale: 1.02,
              filter: 'brightness(1.2)',
            } : {}}
            transition={{ duration: 0.6 }}
          />
        ) : (
          <motion.div
            className="w-full h-full relative"
            animate={isHovered ? {
              scale: 1.02,
              filter: 'brightness(1.2) contrast(1.1)',
            } : {}}
            transition={{ duration: 0.6 }}
          >
            <img
              src={daily.imageUrl}
              alt={daily.id}
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                console.error('Image failed to load:', daily.imageUrl, e)
                // Set a fallback or hide the broken image
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
              onLoad={() => {
                // Image loaded successfully
              }}
            />
          </motion.div>
        )}

        {/* Chromatic aberration overlay on hover */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none chromatic"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.1) 25%, rgba(0,255,0,0.1) 50%, rgba(0,0,255,0.1) 75%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Corrupted data overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
            mixBlendMode: 'difference',
          }}
        />

        {/* Label reveal with glitch text and reflections */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-3 bg-[#0a0a0a]/98 backdrop-blur-md border-t border-[#333] relative"
          >
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
              className="mono text-[9px] text-[#999] leading-tight relative corrupt-text"
              animate={glitchActive ? {
                x: [-1, 1, -0.5, 0.5, 0],
                opacity: [1, 0.7, 1, 0.8, 1],
              } : {}}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-1 flicker rgb-split">
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
          </motion.div>
        )}

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
          <div className="w-full h-full" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          }} />
        </div>
      </motion.div>

      {/* Distortion shadow */}
      <motion.div
        className="absolute inset-0 -z-10 bg-[#000] opacity-0 group-hover:opacity-20 blur-xl"
        style={{
          scale: isHovered ? 1.2 : 1,
          x: isHovered ? shadowX : 0,
          y: isHovered ? shadowY : 0,
        }}
      />
    </motion.div>
  )
}

