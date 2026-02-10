'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { resolveDailyMediaUrl } from '@/lib/data'
import type { DailyArtwork } from '@/types'

function AutoTextarea({ value, placeholder, onChange, className }: {
  value: string
  placeholder: string
  onChange: (val: string) => void
  className: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [expanded, setExpanded] = useState(false)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { if (expanded) resize() }, [expanded, resize])

  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={e => { onChange(e.target.value); resize() }}
      onFocus={() => { setExpanded(true); setTimeout(resize, 0) }}
      onBlur={() => setExpanded(false)}
      className={className}
      style={{
        resize: 'none',
        overflow: expanded ? 'auto' : 'hidden',
        height: expanded ? undefined : '1.5em',
        whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
        textOverflow: expanded ? 'unset' : 'ellipsis',
      }}
    />
  )
}

type FilterMode = 'all' | 'untitled' | 'titled'

export default function AdminPage() {
  const [dailies, setDailies] = useState<DailyArtwork[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const lastSavedRef = useRef<DailyArtwork[]>([])
  const [undoStack, setUndoStack] = useState<DailyArtwork[][]>([])
  const [redoStack, setRedoStack] = useState<DailyArtwork[][]>([])

  useEffect(() => {
    fetch('/api/admin/dailies')
      .then(r => r.json())
      .then(data => { setDailies(data); lastSavedRef.current = data; setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/dailies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailies),
      })
      const data = await res.json()
      setSaveMsg(`Saved ${data.count} entries`)
      lastSavedRef.current = dailies
      setUndoStack([])
      setRedoStack([])
      setDirty(false)
    } catch {
      setSaveMsg('Save failed')
    }
    setSaving(false)
  }

  const undoAll = () => {
    setDailies(lastSavedRef.current)
    setUndoStack([])
    setRedoStack([])
    setDirty(false)
    setSaveMsg('Reverted to last save')
  }

  const pushUndo = (current: DailyArtwork[]) => {
    setUndoStack(prev => [...prev, current])
    setRedoStack([])
  }

  const undoOne = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack(r => [...r, dailies])
    setUndoStack(h => h.slice(0, -1))
    setDailies(prev)
    if (undoStack.length === 1) {
      setDirty(false)
      setSaveMsg('')
    }
  }

  const redoOne = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(h => [...h, dailies])
    setRedoStack(r => r.slice(0, -1))
    setDailies(next)
    setDirty(true)
  }

  const updateDaily = (index: number, field: keyof DailyArtwork, value: string) => {
    setDailies(prev => {
      pushUndo(prev)
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setDirty(true)
  }

  const deleteDaily = (index: number) => {
    const d = dailies[index]
    if (!confirm(`Delete ${d.title || d.id}?`)) return
    pushUndo(dailies)
    setDailies(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }

  // Filtered view — array order is canonical (no sort)
  const filtered = dailies
    .map((d, i) => ({ ...d, _idx: i }))
    .filter(d => {
      if (filter === 'untitled' && d.title) return false
      if (filter === 'titled' && !d.title) return false
      if (search) {
        const q = search.toLowerCase()
        return (d.title?.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))
      }
      return true
    })

  // Drag-to-reorder only when showing all items unfiltered
  const canDrag = !search && filter === 'all'

  const handleDragStart = (realIdx: number) => {
    setDragIdx(realIdx)
  }

  const handleDragOver = (e: React.DragEvent, realIdx: number) => {
    e.preventDefault()
    if (dragOverIdx !== realIdx) setDragOverIdx(realIdx)
  }

  const handleDrop = (toRealIdx: number) => {
    if (dragIdx !== null && dragIdx !== toRealIdx) {
      pushUndo(dailies)
      setDailies(prev => {
        const next = [...prev]
        const [item] = next.splice(dragIdx, 1)
        next.splice(toRealIdx, 0, item)
        return next
      })
      setDirty(true)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const titledCount = dailies.filter(d => d.title).length

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center mono text-sm">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#222] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-grotesk text-2xl font-light tracking-tight">DAILIES ADMIN</h1>
            <div className="mono text-[10px] text-[#666] mt-1">
              {dailies.length} total &middot; {titledCount} titled &middot; {dailies.length - titledCount} untitled
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveMsg && <span className="mono text-[10px] text-[#666]">{saveMsg}</span>}
            {undoStack.length > 0 && (
              <button
                onClick={undoOne}
                className="mono text-[11px] px-4 py-2 border border-[#555] text-[#999] hover:text-white hover:border-[#888] transition-all"
              >
                UNDO
              </button>
            )}
            {redoStack.length > 0 && (
              <button
                onClick={redoOne}
                className="mono text-[11px] px-4 py-2 border border-[#555] text-[#999] hover:text-white hover:border-[#888] transition-all"
              >
                REDO
              </button>
            )}
            {dirty && (
              <button
                onClick={undoAll}
                className="mono text-[11px] px-4 py-2 border border-[#555] text-[#999] hover:text-white hover:border-[#888] transition-all"
              >
                UNDO ALL
              </button>
            )}
            <button
              onClick={save}
              disabled={!dirty || saving}
              className={`mono text-[11px] px-4 py-2 border transition-all ${
                dirty
                  ? 'border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black'
                  : 'border-[#333] text-[#555] cursor-not-allowed'
              }`}
            >
              {saving ? 'SAVING...' : dirty ? 'SAVE' : 'SAVED'}
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div className="max-w-4xl mx-auto flex items-center gap-3 mt-3 flex-wrap">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mono text-xs bg-[#111] border border-[#333] px-3 py-1.5 text-white placeholder-[#555] w-48 focus:border-[#666] outline-none"
          />

          <div className="flex gap-1">
            {(['all', 'untitled', 'titled'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`mono text-[10px] px-3 py-1.5 border transition-all ${
                  filter === f ? 'border-[#555] text-white bg-[#111]' : 'border-[#222] text-[#666] hover:border-[#333]'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mono text-[10px] text-[#555]">
            {filtered.length} shown
            {!canDrag && filtered.length < dailies.length && ' · drag disabled while filtered'}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-6 py-4 space-y-1">
        {filtered.map(daily => {
          const isDragging = dragIdx === daily._idx
          const isOver = dragOverIdx === daily._idx && dragIdx !== daily._idx

          return (
            <div
              key={daily.id}
              draggable={canDrag}
              onDragStart={() => handleDragStart(daily._idx)}
              onDragOver={e => canDrag ? handleDragOver(e, daily._idx) : undefined}
              onDrop={() => canDrag ? handleDrop(daily._idx) : undefined}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 border bg-[#111] group transition-all ${
                isDragging ? 'opacity-30 border-[#444]'
                  : isOver ? 'border-[#c9a84c] border-t-2'
                  : 'border-[#222] hover:border-[#333]'
              }`}
              style={{ minHeight: 56 }}
            >
              {/* Drag handle */}
              {canDrag && (
                <div className="pl-2 cursor-grab active:cursor-grabbing text-[#444] hover:text-[#888] select-none flex-shrink-0"
                  style={{ fontSize: 14, lineHeight: 1, letterSpacing: 2 }}
                >
                  ⋮⋮
                </div>
              )}

              {/* Thumbnail — uses local WebP thumbs for images, video hover for videos */}
              <div className="w-12 h-12 flex-shrink-0 bg-black overflow-hidden relative">
                {daily.imageUrl.endsWith('.mp4') || daily.imageUrl.endsWith('.mov') ? (
                  <video
                    src={resolveDailyMediaUrl(daily.imageUrl)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                  />
                ) : (
                  <img
                    src={`/thumbs/${daily.id}.webp`}
                    alt={daily.title || daily.id}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>

              {/* ID */}
              <div className="mono text-[9px] text-[#666] w-20 flex-shrink-0 truncate">
                {daily.id}
              </div>

              {daily.minted ? (
                <>
                  {/* Locked title */}
                  <div className="flex-1 min-w-0 mono text-xs text-[#c9a84c] truncate">
                    {daily.title}
                  </div>

                  {/* Locked date */}
                  <div className="mono text-[10px] text-[#666] w-28 flex-shrink-0">
                    {daily.savedDate}
                  </div>

                  {/* Minted badge instead of status dropdown */}
                  <div className="mono text-[9px] px-2 py-0.5 bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex-shrink-0">
                    MINTED
                  </div>

                  {/* Lock icon instead of delete */}
                  <div className="mono text-[9px] text-[#444] px-2 py-1 flex-shrink-0" title="Minted — locked">
                    &#x1f512;
                  </div>
                </>
              ) : (
                <>
                  {/* Title */}
                  <AutoTextarea
                    placeholder="Title..."
                    value={daily.title || ''}
                    onChange={val => updateDaily(daily._idx, 'title', val)}
                    className="flex-1 min-w-0 mono text-xs bg-transparent border-b border-[#333] pb-0.5 text-white placeholder-[#444] outline-none focus:border-[#666]"
                  />

                  {/* Description */}
                  <AutoTextarea
                    placeholder="Description..."
                    value={daily.description || ''}
                    onChange={val => updateDaily(daily._idx, 'description', val)}
                    className="w-40 flex-shrink-0 mono text-[10px] bg-transparent border-b border-[#333] pb-0.5 text-[#999] placeholder-[#444] outline-none focus:border-[#666]"
                  />

                  {/* Date */}
                  <input
                    type="date"
                    value={daily.savedDate}
                    onChange={e => updateDaily(daily._idx, 'savedDate', e.target.value)}
                    className="mono text-[10px] bg-transparent border border-[#333] px-1.5 py-0.5 text-[#999] outline-none focus:border-[#666] w-28 flex-shrink-0"
                  />

                  {/* Status */}
                  <select
                    value={daily.status}
                    onChange={e => updateDaily(daily._idx, 'status', e.target.value)}
                    className="mono text-[10px] bg-[#111] border border-[#333] px-1.5 py-0.5 text-[#999] outline-none focus:border-[#666] flex-shrink-0"
                  >
                    <option value="not_listed">NOT LISTED</option>
                    <option value="available">AVAILABLE</option>
                    <option value="sold">SOLD</option>
                  </select>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteDaily(daily._idx)}
                    className="mono text-[9px] text-[#666] px-2 py-1 hover:text-red-400 transition-all flex-shrink-0"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
