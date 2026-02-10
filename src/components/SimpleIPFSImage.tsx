'use client'

import { useState, useEffect, useRef } from 'react'
import { getIpfsUrlsToTry } from '@/lib/ipfs'

type ImageState = 'loading' | 'loaded' | 'error'

/**
 * IPFS image: tries proxy first (fast if cached), then falls back to direct gateways.
 * Only shows "unavailable" after all URLs fail. Matches SmartIPFSImage's proven pattern.
 */
export function SimpleIPFSImage({
  src,
  alt,
  className,
  timeout = 15000,
  onLoad,
  onError,
}: {
  src: string
  alt: string
  className?: string
  timeout?: number
  onLoad?: () => void
  onError?: () => void
}) {
  const urlsToTry = getIpfsUrlsToTry(src)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ImageState>('loading')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const url = urlsToTry[attempt] ?? urlsToTry[0] ?? ''

  useEffect(() => {
    if (state !== 'loading' || !url) return

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      if (attempt < urlsToTry.length - 1) {
        setAttempt((a) => a + 1)
        setState('loading')
      } else {
        setState('error')
        onError?.()
      }
    }, timeout)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [state, timeout, onError, url, attempt, urlsToTry.length])

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setState('loaded')
    onLoad?.()
  }

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (attempt < urlsToTry.length - 1) {
      setAttempt((a) => a + 1)
      setState('loading')
    } else {
      setState('error')
      onError?.()
    }
  }

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#111]">
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative min-h-0">
      {/* Skeleton overlay */}
      <div
        className="absolute inset-0 bg-gray-800 animate-pulse transition-opacity duration-200"
        style={{ opacity: state === 'loading' ? 1 : 0 }}
        aria-hidden
      />
      {/* Image */}
      <img
        key={url}
        src={url}
        alt={alt}
        loading="lazy"
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
      {/* Error overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-[#111] transition-opacity duration-200"
        style={{ opacity: state === 'error' ? 1 : 0 }}
        aria-hidden={state !== 'error'}
      >
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    </div>
  )
}
