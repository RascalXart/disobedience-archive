'use client'

/**
 * Fixed progress bar at the bottom of the viewport.
 * Shown when 0 <= progress < 1 (current scope still loading). Disappears at 100%;
 * reappears when more images enter scope (e.g. Load more). Progress = current scope only.
 * Text styled like smaller archive text on the site.
 */
export function GlitchLoadingBar({
  progress,
  visible: visibleProp,
}: {
  progress: number
  visible?: boolean
}) {
  const visible = visibleProp !== undefined ? visibleProp : (progress < 1 && progress >= 0)
  if (!visible) return null

  const pct = Math.min(1, Math.max(0, progress)) * 100

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[10002] flex flex-col bg-[#0a0a0a] border-t-2 border-[#333] shadow-[0_-4px_24px_rgba(0,255,255,0.08)]"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading images"
    >
      <div className="flex items-center justify-center gap-4 px-4 py-3">
        <span className="mono text-xs text-[#666] tracking-wider flicker">
          LOADING IMAGES...
        </span>
        <span className="mono text-xs text-[#555] tabular-nums">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="relative h-3 bg-[#111]">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0a0a0a] via-[#0ff] to-[#0f0] opacity-90 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
