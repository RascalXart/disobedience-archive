'use client'

import { useState } from 'react'
import { resolveIpfsUrl } from '@/lib/ipfs'

/**
 * Renders an image from an IPFS or HTTP URL.
 * Uses resolveIpfsUrl() for the src; then a plain <img> with native lazy loading.
 * Skeleton until load; "Image unavailable" on error. No retries, no observers, no queues.
 */
export function AbortableIpfsImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) {
  const url = resolveIpfsUrl(src) || src
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[#111] ${className ?? ''}`}>
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative min-h-0">
      <div
        className="absolute inset-0 bg-[#1a1a1a] animate-pulse"
        style={{ opacity: loaded ? 0 : 1 }}
        aria-hidden
      />
      <img
        src={url}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
      />
    </div>
  )
}
