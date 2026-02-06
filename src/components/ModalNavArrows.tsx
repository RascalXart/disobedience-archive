'use client'

interface ModalNavArrowsProps {
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

/** Subtle prev/next arrows for image modals. Position on backdrop so they don't overlap content. */
export function ModalNavArrows({ hasPrev, hasNext, onPrev, onNext }: ModalNavArrowsProps) {
  const btnClass =
    'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center border border-[#333] bg-[#0a0a0a]/80 hover:bg-[#1a1a1a] hover:border-[#444] text-[#555] hover:text-[#888] transition-colors text-sm pointer-events-auto'

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className={`left-2 md:left-4 ${btnClass}`}
          aria-label="Previous"
        >
          ←
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className={`right-2 md:right-4 ${btnClass}`}
          aria-label="Next"
        >
          →
        </button>
      )}
    </div>
  )
}
