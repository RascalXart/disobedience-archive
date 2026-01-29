'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FilterStatus } from '@/types'

interface GalleryFiltersProps {
  statusFilter: FilterStatus
  onStatusChange: (status: FilterStatus) => void
  selectedTags: string[]
  availableTags: string[]
  onTagsChange: (tags: string[]) => void
  dateRange: { start: string; end: string }
  onDateRangeChange: (range: { start: string; end: string }) => void
}

export function GalleryFilters({
  statusFilter,
  onStatusChange,
  selectedTags,
  availableTags,
  onTagsChange,
  dateRange,
  onDateRangeChange,
}: GalleryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  return (
    <div className="mb-12 space-y-6 border-b border-[#222] pb-8">
      {/* Status Filter - Terminal style */}
      <div>
        <div className="mono text-xs text-[#666] mb-3 tracking-wider">[FILTER_STATUS]</div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'available', 'sold'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`mono text-xs px-4 py-2 border transition-all ${
                statusFilter === status
                  ? 'bg-white text-[#0a0a0a] border-white hover:glitch'
                  : 'bg-transparent border-[#333] text-[#999] hover:border-[#555] hover:text-white'
              }`}
            >
              [{status === 'all' ? 'ALL' : status === 'available' ? 'AVAILABLE' : 'SOLD'}]
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Filters */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mono text-xs text-[#666] hover:text-white transition-colors flex items-center gap-2"
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>[ADVANCED_FILTERS]</span>
        </button>

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 pt-6 mt-6 border-t border-[#222]"
          >
            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div>
                <div className="mono text-xs text-[#666] mb-3 tracking-wider">[FILTER_TAGS]</div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`mono text-xs px-3 py-1 border transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-[#222] border-[#444] text-white'
                          : 'bg-transparent border-[#333] text-[#666] hover:border-[#555] hover:text-white'
                      }`}
                    >
                      {tag.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filter */}
            <div>
              <div className="mono text-xs text-[#666] mb-3 tracking-wider">[FILTER_DATE_RANGE]</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mono text-xs text-[#666] mb-2 block">START</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      onDateRangeChange({ ...dateRange, start: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111] border border-[#222] text-white mono text-xs focus:outline-none focus:border-[#444] transition-colors"
                  />
                </div>
                <div>
                  <label className="mono text-xs text-[#666] mb-2 block">END</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      onDateRangeChange({ ...dateRange, end: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#111] border border-[#222] text-white mono text-xs focus:outline-none focus:border-[#444] transition-colors"
                  />
                </div>
              </div>
            </div>

            {(selectedTags.length > 0 || dateRange.start || dateRange.end) && (
              <button
                onClick={() => {
                  onTagsChange([])
                  onDateRangeChange({ start: '', end: '' })
                }}
                className="mono text-xs text-[#666] hover:text-white transition-colors"
              >
                [CLEAR_FILTERS]
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
