'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Progressive loader with infinite scroll.
 * Renders items in batches, auto-loads more when the sentinel nears the viewport.
 * Uses scroll listener + debounced re-check to avoid loading everything at once.
 */
export function useProgressiveLoader<T>(items: T[], batchSize: number = 20) {
  const [visibleCount, setVisibleCount] = useState(batchSize)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset when items array identity changes (filter/shuffle)
  useEffect(() => {
    setVisibleCount(batchSize)
  }, [items, batchSize])

  const visibleItems = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  useEffect(() => {
    if (!hasMore) return

    let active = true
    let pendingTimer: ReturnType<typeof setTimeout> | null = null
    let rafId: number | null = null

    const check = () => {
      if (!active) return
      if (pendingTimer) clearTimeout(pendingTimer)
      pendingTimer = null
      const el = sentinelRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight + 400) {
        setVisibleCount((v) => Math.min(v + batchSize, items.length))
        // Re-check after delay — handles tall screens where sentinel
        // stays in range after a batch, without cascading instantly.
        pendingTimer = setTimeout(check, 500)
      }
    }

    // Throttle scroll to once per animation frame
    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        check()
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Initial check for when content doesn't fill viewport
    pendingTimer = setTimeout(check, 200)

    return () => {
      active = false
      window.removeEventListener('scroll', onScroll)
      if (pendingTimer) clearTimeout(pendingTimer)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [hasMore, batchSize, items.length])

  return {
    visibleItems,
    hasMore,
    sentinelRef,
  }
}
