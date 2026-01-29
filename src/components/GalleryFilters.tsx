'use client'

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
  return (
    <div className="mb-12 space-y-6 border-b border-[#222] pb-8">
      <div>
        <div className="mono text-xs text-[#666] mb-3">STATUS</div>
        <div className="flex gap-3">
          {(['all', 'available', 'sold', 'not_listed'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`mono text-xs px-4 py-2 border transition-colors ${
                statusFilter === status
                  ? 'border-[#444] bg-[#111] text-[#999]'
                  : 'border-[#222] text-[#666] hover:border-[#333]'
              }`}
            >
              {status.toUpperCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {availableTags.length > 0 && (
        <div>
          <div className="mono text-xs text-[#666] mb-3">TAGS</div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    onTagsChange(selectedTags.filter((t) => t !== tag))
                  } else {
                    onTagsChange([...selectedTags, tag])
                  }
                }}
                className={`mono text-xs px-3 py-1 border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'border-[#444] bg-[#111] text-[#999]'
                    : 'border-[#222] text-[#666] hover:border-[#333]'
                }`}
              >
                {tag.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mono text-xs text-[#666] mb-2">START DATE</div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
            className="w-full px-3 py-2 bg-[#111] border border-[#222] text-[#999] mono text-xs focus:border-[#333] focus:outline-none"
          />
        </div>
        <div>
          <div className="mono text-xs text-[#666] mb-2">END DATE</div>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
            className="w-full px-3 py-2 bg-[#111] border border-[#222] text-[#999] mono text-xs focus:border-[#333] focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
