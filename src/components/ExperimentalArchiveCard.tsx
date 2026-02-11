'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { DailyArtwork } from '@/types'
import { resolveDailyMediaUrl } from '@/lib/data'
import { resolveENSCached } from '@/lib/ens-cache'

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// === Grid concurrency limit (homepage images, separate from SmartIPFSImage) ===
// Only MAX_CONCURRENT_DAILY images load at a time over the shared HTTP/2
// connection. Without this, 20+ GIFs split bandwidth and ALL load slowly.
const MAX_CONCURRENT_DAILY = 6
let _dailySlots = 0
const _dailySlotSubs = new Set<() => void>()
function notifyDailySlotChange() { _dailySlotSubs.forEach(cb => cb()) }

// Cancel an img download without hitting the network.
// img.src = '' causes the browser to request the current page URL — bad.
// A data URI is local-only: cancels the HTTP stream, fires no network request.
const CANCEL_SRC = 'data:,'

/** Thumbnail path for a daily (matches generate-daily-thumbnails.js output) */
function getDailyThumbnailPath(id: string): string {
  return `/thumbs/${id}.webp`
}

type ImgState = 'idle' | 'loaded' | 'error'

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
  const [imgState, setImgState] = useState<ImgState>('idle')
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [slotClaimed, setSlotClaimed] = useState(false)
  const [videoActivated, setVideoActivated] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imgStateRef = useRef<ImgState>('idle')
  imgStateRef.current = imgState

  const isVideo = daily.imageUrl.includes('.mp4') || daily.imageUrl.includes('.mov')
  const mediaUrl = resolveDailyMediaUrl(daily.imageUrl)
  const thumbnailSrc = !isVideo ? getDailyThumbnailPath(daily.id) : null

  // Should the full-res <img> be in the DOM and actively loading?
  const shouldLoadImage = !isVideo && isVisible && imgState === 'idle' && !isModalOpen && slotClaimed
  // Show the <img> when actively loading OR already loaded
  const showFullImg = !isVideo && (shouldLoadImage || imgState === 'loaded')

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

  // IntersectionObserver — viewport visibility, cancel on leave, video play/pause
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (isVideo) setVideoActivated(true)
          // Recover images stuck in error state when scrolling back into view
          if (imgStateRef.current === 'error') {
            setImgState('idle')
          }
        } else {
          setIsVisible(false)
        }
        // Video play/pause
        if (videoRef.current) {
          if (entry.isIntersecting) {
            videoRef.current.play().catch(() => {})
          } else {
            videoRef.current.pause()
          }
        }
      },
      { rootMargin: '200px', threshold: 0.01 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVideo])

  // Grid concurrency — claim a loading slot (images only, videos bypass)
  useEffect(() => {
    if (isVideo || imgState !== 'idle' || !isVisible || isModalOpen) return
    let claimed = false
    const tryClaim = () => {
      if (claimed || _dailySlots >= MAX_CONCURRENT_DAILY) return
      _dailySlots++
      claimed = true
      setSlotClaimed(true)
      _dailySlotSubs.delete(tryClaim)
    }
    tryClaim()
    if (!claimed) _dailySlotSubs.add(tryClaim)
    return () => {
      _dailySlotSubs.delete(tryClaim)
      if (claimed) {
        _dailySlots--
        claimed = false
        setSlotClaimed(false)
        notifyDailySlotChange()
      }
    }
  }, [isVideo, imgState, isVisible, isModalOpen])

  // Resolve ENS for minted piece owner — set short address immediately, upgrade to ENS async
  useEffect(() => {
    if (!daily.minted || !daily.owner) return
    setOwnerName(shortenAddress(daily.owner))
    let cancelled = false
    resolveENSCached(daily.owner).then(name => {
      if (!cancelled && name) setOwnerName(name)
    })
    return () => { cancelled = true }
  }, [daily.minted, daily.owner])

  // Callback ref for full-res image — cancel download on unmount
  const fullImgCallbackRef = useCallback((img: HTMLImageElement | null) => {
    if (img === null && imgRef.current) {
      if (imgStateRef.current === 'idle') {
        imgRef.current.src = CANCEL_SRC
      }
    }
    imgRef.current = img
  }, [])

  // Thumbnail ref — catch already-cached thumbnails (onLoad may fire before React wires it)
  const thumbRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setThumbLoaded(true)
  }, [])

  const handleLoad = useCallback(() => {
    setImgState('loaded')
  }, [])

  const handleError = useCallback(() => {
    setImgState('error')
  }, [])

  const size = { w: 'w-full', h: 'aspect-square' }

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
      className={`${size.w} group cursor-pointer relative`}
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
          videoActivated ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] group-hover:brightness-110"
              autoPlay={isVisible && !isModalOpen}
              muted
              loop
              playsInline
              preload="none"
              style={{
                willChange: isModalOpen ? 'auto' : 'transform',
                opacity: isModalOpen ? 0.3 : 1,
                filter: isModalOpen ? 'blur(2px)' : 'none',
              }}
              onError={(e) => {
                console.error('Video failed to load:', mediaUrl, e)
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#111]" />
          )
        ) : (
          <div
            className="w-full h-full relative"
            style={{
              willChange: isModalOpen ? 'auto' : 'transform',
              opacity: isModalOpen ? 0.3 : 1,
              filter: isModalOpen ? 'blur(2px)' : 'none',
              transition: 'opacity 0.2s, filter 0.2s',
            }}
          >
            {/* Skeleton pulse */}
            <div
              className="absolute inset-0 bg-gray-800 animate-pulse transition-opacity duration-200"
              style={{ opacity: !thumbLoaded && imgState !== 'loaded' ? 1 : 0 }}
              aria-hidden
            />
            {/* Thumbnail — loads from local WebP, near-instant */}
            {thumbnailSrc && (
              <img
                ref={thumbRef}
                src={thumbnailSrc}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden
                onLoad={() => setThumbLoaded(true)}
                onError={() => setThumbLoaded(false)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: thumbLoaded && imgState !== 'loaded' ? 1 : 0,
                  transition: 'opacity 0.2s ease-out',
                }}
              />
            )}
            {/* Full-res image */}
            {showFullImg && (
              <img
                ref={fullImgCallbackRef}
                key={mediaUrl}
                src={mediaUrl}
                alt={daily.id}
                decoding="async"
                className="transition-transform duration-300 group-hover:scale-[1.02] group-hover:brightness-110"
                onLoad={handleLoad}
                onError={handleError}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: imgState === 'loaded' ? 1 : 0,
                  transition: 'opacity 0.2s ease-out',
                }}
              />
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
                {(daily.title || daily.id.replace(/_/g, ' ')).toUpperCase()}
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
                {(daily.title || daily.id.replace(/_/g, ' ')).toUpperCase()}
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
                {(daily.title || daily.id.replace(/_/g, ' ')).toUpperCase()}
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

      {/* Title below image */}
      {daily.title && (
        <div className="mono text-[8px] text-[#666] mt-1.5 leading-tight truncate tracking-wide">
          {daily.title.toUpperCase()}
        </div>
      )}

      {/* Minted indicator — red circle, absolutely positioned so it doesn't affect grid spacing */}
      {daily.minted && (
        <div
          className="absolute -bottom-4 right-1 w-3 h-3 rounded-full bg-red-500 cursor-pointer transition-all hover:bg-red-400 hover:scale-125 z-10"
          onMouseEnter={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setTooltipPos(null)}
          onClick={(e) => {
            e.stopPropagation()
            window.open(`https://opensea.io/assets/ethereum/${daily.contractAddress}/${daily.tokenId}`, '_blank')
          }}
        />
      )}

      {/* Owner tooltip — portaled to body to escape framer-motion transform context */}
      {tooltipPos && ownerName && createPortal(
        <div
          className="fixed z-[100] mono text-[10px] text-white bg-[#111] border border-[#333] px-2 py-1 pointer-events-none whitespace-nowrap"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          {ownerName}
        </div>,
        document.body
      )}
    </motion.div>
  )
}
