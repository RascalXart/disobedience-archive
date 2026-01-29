'use client'

import { useState, useEffect, useRef } from 'react'
import { CompactArchiveCard } from './CompactArchiveCard'
import type { DailyArtwork } from '@/types'

interface LazyArchiveCardProps {
  daily: DailyArtwork
  index: number
  onClick?: () => void
}

export function LazyArchiveCard({ daily, index, onClick }: LazyArchiveCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            // Once loaded, we can disconnect the observer
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={cardRef} className="min-h-[200px]">
      {isVisible ? (
        <CompactArchiveCard
          daily={daily}
          index={index}
          onClick={onClick}
        />
      ) : (
        // Placeholder to maintain layout
        <div className="aspect-square bg-[#111] border border-[#222] animate-pulse" />
      )}
    </div>
  )
}

