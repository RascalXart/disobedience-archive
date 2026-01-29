'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getAllArtworks } from '@/lib/data'
import { ArtworkCard } from '@/components/ArtworkCard'
import { GalleryFilters } from '@/components/GalleryFilters'
import type { FilterStatus, Artwork } from '@/types'

export default function GalleryPage() {
  const allArtworks = getAllArtworks()
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    allArtworks.forEach((artwork) => {
      artwork.tags.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [allArtworks])

  const filteredArtworks = useMemo(() => {
    let filtered: Artwork[] = allArtworks

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((artwork) => artwork.status === statusFilter)
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((artwork) =>
        selectedTags.some((tag) => artwork.tags.includes(tag))
      )
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(
        (artwork) => artwork.date >= dateRange.start
      )
    }
    if (dateRange.end) {
      filtered = filtered.filter((artwork) => artwork.date <= dateRange.end)
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allArtworks, statusFilter, selectedTags, dateRange])

  return (
    <main className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          <div className="mono text-xs text-[#666] mb-4 tracking-wider">
            [GALLERY_VIEW]
          </div>
          <h1 className="font-grotesk text-5xl md:text-7xl font-light mb-4 tracking-tighter">
            GALLERY
          </h1>
          <p className="mono text-sm text-[#888] mb-12">
            {filteredArtworks.length} {filteredArtworks.length === 1 ? 'ENTRY' : 'ENTRIES'} FOUND
          </p>

          <GalleryFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            selectedTags={selectedTags}
            availableTags={availableTags}
            onTagsChange={setSelectedTags}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />

          {filteredArtworks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="mono text-sm text-[#666]">NO ARTWORKS FOUND MATCHING FILTERS</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtworks.map((artwork, index) => (
                <motion.div
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <ArtworkCard artwork={artwork} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
