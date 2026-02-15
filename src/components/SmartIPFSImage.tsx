'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { getIpfsUrlsToTry, getThumbnailPath } from '@/lib/ipfs'

type ImageState = 'loading' | 'loaded' | 'error'

// === Global pause ===
// useSyncExternalStore makes the pause flag reactive — when it changes,
// React re-renders all SmartIPFSImage components automatically.
// activeGridImgs provides immediate imperative cancellation so we don't
// have to wait for React's async re-render to free up bandwidth.
let _paused = false
const _subs = new Set<() => void>()
const activeGridImgs = new Set<HTMLImageElement>()

// === Grid concurrency limit ===
// Only MAX_CONCURRENT_GRID grid images load at a time over the shared HTTP/2
// connection. Without this, 20+ images split bandwidth and ALL load slowly.
// With it, the first few appear ~4x faster and the rest follow sequentially.
const MAX_CONCURRENT_GRID = 3
let _gridSlots = 0
const _slotSubs = new Set<() => void>()
function notifySlotChange() { _slotSubs.forEach(cb => cb()) }

// Cancel an img download without hitting the network.
// img.src = '' causes the browser to request the current page URL — bad.
// A data URI is local-only: cancels the HTTP stream, fires no network request.
const CANCEL_SRC = 'data:,'

function subscribePause(cb: () => void) {
  _subs.add(cb)
  return () => { _subs.delete(cb) }
}
function getPaused() { return _paused }

export function pauseAllIPFSLoads() {
  if (_paused) return
  _paused = true
  // Kill all grid downloads NOW — don't wait for React re-render
  activeGridImgs.forEach(img => { img.src = CANCEL_SRC })
  activeGridImgs.clear()
  _subs.forEach(cb => cb())
}

export function resumeAllIPFSLoads() {
  if (!_paused) return
  _paused = false
  _subs.forEach(cb => cb())
}

// Cache of fully-loaded src URLs — instant display when switching views
const loadedSrcs = new Set<string>()

// Only one priority image loads at a time (modal/fullscreen).
// Rapid arrow navigation cancels the previous one.
let currentPriorityImg: HTMLImageElement | null = null

/**
 * IPFS image with thumbnail preview and gateway fallback.
 * Shows a local WebP thumbnail immediately, then loads full-res from IPFS.
 * Set `priority` for modal/fullscreen (skips global pause, loads immediately).
 */
export function SmartIPFSImage({
  src,
  alt,
  className,
  timeout: timeoutProp,
  priority = false,
  eager = false,
  onLoad,
  onError,
}: {
  src: string
  alt: string
  className?: string
  timeout?: number
  priority?: boolean
  eager?: boolean
  onLoad?: () => void
  onError?: () => void
}) {
  // Priority: 20s for the whole parallel race (all gateways at once)
  // Grid: 15s per gateway (sequential attempts)
  const timeout = timeoutProp ?? (priority ? 20000 : 15000)
  const urlsToTry = getIpfsUrlsToTry(src)
  const thumbnailSrc = getThumbnailPath(src)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ImageState>(loadedSrcs.has(src) ? 'loaded' : 'loading')
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(priority)
  const globalPaused = useSyncExternalStore(subscribePause, getPaused, getPaused)
  const [slotClaimed, setSlotClaimed] = useState(false)
  const [racedUrl, setRacedUrl] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const srcRef = useRef(src); srcRef.current = src
  const stateRef = useRef(state); stateRef.current = state
  const priorityRef = useRef(priority); priorityRef.current = priority
  const onLoadRef = useRef(onLoad); onLoadRef.current = onLoad
  const onErrorRef = useRef(onError); onErrorRef.current = onError
  const fullImgRef = useRef<HTMLImageElement | null>(null)
  const retryCountRef = useRef(0)

  const url = urlsToTry[attempt] ?? urlsToTry[0] ?? ''

  // Should the full-res <img> be in the DOM and actively loading?
  // Priority images wait for the race to pick a winner URL before mounting.
  // Grid images use sequential attempts with concurrency slots.
  const shouldLoad = isVisible && state === 'loading' && (
    priority ? racedUrl !== null : (!globalPaused && (eager || slotClaimed))
  )

  // Show the <img> when actively loading OR already loaded (and visible)
  const showFullImg = shouldLoad || (isVisible && state === 'loaded')

  // Priority: use the race winner (or fall back to proxy for cached images)
  // Grid: use the current sequential attempt
  const displayUrl = priority ? (racedUrl || url) : url

  // Thumbnail ref — catches already-cached images (load event fires before React's onLoad)
  const thumbRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setThumbLoaded(true)
  }, [])

  // Full image ref — cancels downloads on unmount, enforces single priority image,
  // and registers/unregisters grid images for immediate cancellation by pauseAllIPFSLoads.
  const fullImgCallbackRef = useCallback((img: HTMLImageElement | null) => {
    if (img === null && fullImgRef.current) {
      // Unmounting — cancel download and unregister
      activeGridImgs.delete(fullImgRef.current)
      if (stateRef.current === 'loading') {
        fullImgRef.current.src = CANCEL_SRC
      }
      if (currentPriorityImg === fullImgRef.current) {
        currentPriorityImg = null
      }
    } else if (img) {
      if (priorityRef.current) {
        // New priority image — cancel previous if still loading
        if (currentPriorityImg && currentPriorityImg !== img) {
          currentPriorityImg.src = CANCEL_SRC
        }
        currentPriorityImg = img
      } else {
        // Grid image — register for immediate cancellation
        activeGridImgs.add(img)
      }
    }
    fullImgRef.current = img
  }, [])

  // IntersectionObserver — track viewport visibility
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Recover images stuck in error state when scrolling back into view
          if (stateRef.current === 'error') {
            retryCountRef.current = 0
            setAttempt(0)
            setState('loading')
          }
        } else if (stateRef.current === 'loading' && !priorityRef.current) {
          // Left viewport while still loading → cancel
          if (fullImgRef.current) {
            activeGridImgs.delete(fullImgRef.current)
            fullImgRef.current.src = CANCEL_SRC
            fullImgRef.current = null
          }
          setIsVisible(false)
          setAttempt(0)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Grid concurrency — claim a loading slot (priority images bypass the limit)
  useEffect(() => {
    if (priority || eager || state !== 'loading' || !isVisible || globalPaused) return
    let claimed = false
    const tryClaim = () => {
      if (claimed || _gridSlots >= MAX_CONCURRENT_GRID) return
      _gridSlots++
      claimed = true
      setSlotClaimed(true)
      _slotSubs.delete(tryClaim)
    }
    tryClaim()
    if (!claimed) _slotSubs.add(tryClaim)
    return () => {
      _slotSubs.delete(tryClaim)
      if (claimed) {
        _gridSlots--
        claimed = false
        setSlotClaimed(false)
        notifySlotChange()
      }
    }
  }, [priority, state, isVisible, globalPaused])

  // Race all gateways in parallel (priority images only).
  // Instead of trying gateways sequentially (8s × 4 = 32s worst case),
  // fire all URLs at once and use the first to respond.
  useEffect(() => {
    if (!priority || state !== 'loading') return

    let won = false
    const racers: HTMLImageElement[] = []
    let failures = 0

    urlsToTry.forEach((tryUrl) => {
      const img = new Image()
      racers.push(img)
      img.onload = () => {
        if (won) return
        won = true
        racers.forEach(r => { if (r !== img) r.src = CANCEL_SRC })
        setRacedUrl(tryUrl)
      }
      img.onerror = () => {
        failures++
        if (failures === urlsToTry.length && !won) {
          won = true
          setState('error')
          onErrorRef.current?.()
        }
      }
      img.src = tryUrl
    })

    // Overall timeout — if no gateway responds, fail
    const timer = setTimeout(() => {
      if (won) return
      won = true
      racers.forEach(r => { r.src = CANCEL_SRC })
      setState('error')
      onErrorRef.current?.()
    }, timeout)

    return () => {
      won = true
      clearTimeout(timer)
      racers.forEach(img => { img.src = CANCEL_SRC })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, state, src])

  // Gateway timeout — try next URL if current one is too slow (grid images only)
  useEffect(() => {
    if (!shouldLoad || !url || priority) return

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      if (attempt < urlsToTry.length - 1) {
        setAttempt(a => a + 1)
        setState('loading')
      } else {
        setState('error')
        onErrorRef.current?.()
      }
    }, timeout)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [shouldLoad, timeout, url, attempt, urlsToTry.length])

  // Auto-retry for priority images: if all gateways fail, try the full
  // sequence once more after 2s. IPFS gateways are often transiently slow
  // and succeed on a second pass.
  useEffect(() => {
    if (state !== 'error' || !priority || retryCountRef.current >= 1) return
    const timer = setTimeout(() => {
      retryCountRef.current++
      setAttempt(0)
      setState('loading')
    }, 2000)
    return () => clearTimeout(timer)
  }, [state, priority])

  const handleLoad = useCallback(() => {
    // Ignore if this grid image was cancelled by pauseAllIPFSLoads
    if (_paused && !priorityRef.current) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (fullImgRef.current) activeGridImgs.delete(fullImgRef.current)
    setState('loaded')
    loadedSrcs.add(srcRef.current)
    onLoadRef.current?.()
  }, [])

  const handleError = useCallback(() => {
    // Ignore errors from cancellation (CANCEL_SRC) during global pause
    if (_paused && !priorityRef.current) return
    // Priority errors are handled by the race effect, not the visible <img>
    if (priorityRef.current) return
    // If the observer already cancelled this image (nulled the ref), ignore
    if (!fullImgRef.current) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (attempt < urlsToTry.length - 1) {
      setAttempt(a => a + 1)
      setState('loading')
    } else {
      setState('error')
      onErrorRef.current?.()
    }
  }, [attempt, urlsToTry.length])

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#111]">
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative min-h-0">
      {/* Skeleton */}
      <div
        className="absolute inset-0 bg-gray-800 animate-pulse transition-opacity duration-200"
        style={{ opacity: !thumbLoaded && state !== 'loaded' ? 1 : 0 }}
        aria-hidden
      />
      {/* Thumbnail — loads instantly from local WebP */}
      {thumbnailSrc && (
        <img
          ref={thumbRef}
          src={thumbnailSrc}
          alt=""
          loading="eager"
          decoding="async"
          aria-hidden
          onLoad={() => setThumbLoaded(true)}
          onError={() => setThumbLoaded(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: thumbLoaded && state !== 'loaded' ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
        />
      )}
      {/* Full-res IPFS image */}
      {showFullImg && (
        <img
          ref={fullImgCallbackRef}
          key={displayUrl}
          src={displayUrl}
          alt={alt}
          decoding="async"
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: state === 'loaded' ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
        />
      )}
      {/* Error overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-[#111] transition-opacity duration-200"
        style={{ opacity: state === 'error' && !thumbLoaded ? 1 : 0, pointerEvents: state === 'error' && !thumbLoaded ? 'auto' : 'none' }}
        aria-hidden={state !== 'error' || thumbLoaded}
      >
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    </div>
  )
}
