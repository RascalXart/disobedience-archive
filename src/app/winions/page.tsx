'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getAllWinionsNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'
import { SmartIPFSImage, pauseAllIPFSLoads, resumeAllIPFSLoads } from '@/components/SmartIPFSImage'
import { generateTwitterShareUrl } from '@/lib/twitter-share'
import { resolveENSCached } from '@/lib/ens-cache'
import { ModalNavArrows } from '@/components/ModalNavArrows'
import type { CollectionNFT, NFTAttribute } from '@/types'

/** Modal/hero image: priority flag exempts from global pause */
function WinionImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <SmartIPFSImage src={src} alt={alt} className={className} priority />
  )
}

/** Grid slot: SmartIPFSImage with label. */
function WinionGridCardSlot({
  nft,
  onSelect,
}: {
  nft: CollectionNFT
  onSelect: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="group cursor-pointer"
      onClick={onSelect}
    >
      <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors">
        {nft.imageUrl ? (
          <SmartIPFSImage
            src={nft.imageUrl}
            alt={nft.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-[#111]" />
        )}
        <div className="absolute inset-0 bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/20 transition-colors" />
      </div>
      <div className="mt-1">
        <div className="mono text-[8px] text-[#666] group-hover:text-[#888] transition-colors truncate">
          #{nft.tokenId}
        </div>
      </div>
    </motion.div>
  )
}

interface TraitFilter {
  traitType: string
  value: string
  count: number
}

const GRID_GAP_PX = 12
const GRID_OVERSCAN_ROWS = 3
const GRID_LABEL_HEIGHT_PX = 24

export default function WinionsPage() {
  const allNFTsRaw = getAllWinionsNFTs()
  // Sort by number in name; unnumbered scattered; 1 of 1 House Generals scattered throughout (not bunched at start)
  const sortedNFTs = useMemo(() => {
    const isHouseGeneral = (nft: typeof allNFTsRaw[0]) =>
      nft.attributes?.some((a: { trait_type?: string }) => a.trait_type === '1 of 1 House General') ?? false
    const hash = (s: string) => s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)

    const houseGenerals = allNFTsRaw.filter(isHouseGeneral)
    const rest = allNFTsRaw.filter((nft) => !isHouseGeneral(nft))

    const extractNum = (name: string): number | null => {
      const m = name.match(/#(\d+)/)
      return m ? parseInt(m[1], 10) : null
    }
    const withNum: { nft: typeof allNFTsRaw[0]; num: number }[] = []
    const withoutNum: typeof allNFTsRaw = []
    rest.forEach((nft) => {
      const num = extractNum(nft.name || '')
      if (num != null) withNum.push({ nft, num })
      else withoutNum.push(nft)
    })
    withNum.sort((a, b) => a.num - b.num)
    withoutNum.sort((a, b) => hash(a.tokenId) - hash(b.tokenId))
    const restTotal = rest.length
    const M = withoutNum.length
    let restSorted: typeof allNFTsRaw
    if (M === 0) {
      restSorted = withNum.map((x) => x.nft)
    } else {
      const indices = [...Array(restTotal)].map((_, i) => i)
      indices.sort((a, b) => hash(String(a)) - hash(String(b)))
      const reserved = new Set(indices.slice(0, M))
      restSorted = []
      let numIdx = 0
      let unnumIdx = 0
      for (let i = 0; i < restTotal; i++) {
        if (reserved.has(i)) restSorted.push(withoutNum[unnumIdx++])
        else restSorted.push(withNum[numIdx++].nft)
      }
    }

    const total = allNFTsRaw.length
    const G = houseGenerals.length
    if (G === 0) return restSorted
    // Scatter house generals evenly across the collection (deterministic positions)
    const generalPositions = new Set(
      [...Array(G)].map((_, i) => Math.floor(((i + 1) * total) / (G + 1)))
    )
    const result: typeof allNFTsRaw = []
    let restIdx = 0
    let generalIdx = 0
    for (let i = 0; i < total; i++) {
      if (generalPositions.has(i)) result.push(houseGenerals[generalIdx++])
      else result.push(restSorted[restIdx++])
    }
    return result
  }, [allNFTsRaw])
  
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [heroOpen, setHeroOpen] = useState(false)
  const [showHeroMeta, setShowHeroMeta] = useState(false)
  const heroMetaStillRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set())
  const [collapsedTraits, setCollapsedTraits] = useState<Set<string>>(new Set())
  const [isShuffled, setIsShuffled] = useState(false)
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})
  const [gridSize, setGridSize] = useState(180)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const gridMeasureRef = useRef<HTMLDivElement>(null)
  const [gridScrollTop, setGridScrollTop] = useState(0)
  const [gridViewportHeight, setGridViewportHeight] = useState(0)
  const [gridViewportWidth, setGridViewportWidth] = useState(0)
  // Start with sidebar collapsed on mobile - always false initially to match SSR
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  // Set initial state and update on resize (after mount to avoid hydration mismatch)
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 768) {
          setIsMobileSidebarOpen(false)
        } else {
          setIsMobileSidebarOpen(true)
        }
      }
    }
    // Set initial state after mount
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Shuffle or sort NFTs
  const allNFTs = useMemo(() => {
    if (isShuffled) {
      // Fisher-Yates shuffle
      const shuffled = [...sortedNFTs]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    return sortedNFTs
  }, [sortedNFTs, isShuffled])
  
  // Extract all unique traits with counts
  const allTraits = useMemo(() => {
    const traitMap = new Map<string, TraitFilter>()
    
    allNFTs.forEach(nft => {
      nft.attributes.forEach(attr => {
        const key = `${attr.trait_type || 'Unknown'}:${attr.value}`
        if (!traitMap.has(key)) {
          traitMap.set(key, {
            traitType: attr.trait_type || 'Unknown',
            value: String(attr.value),
            count: 0,
          })
        }
        traitMap.get(key)!.count++
      })
    })
    
    // Group by trait type
    const grouped = new Map<string, TraitFilter[]>()
    traitMap.forEach(trait => {
      if (!grouped.has(trait.traitType)) {
        grouped.set(trait.traitType, [])
      }
      grouped.get(trait.traitType)!.push(trait)
    })
    
    // Sort each group by count (descending)
    grouped.forEach((traits, type) => {
      traits.sort((a, b) => b.count - a.count)
    })
    
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [allNFTs])
  
  // Pre-index NFT traits for O(1) lookups (performance optimization)
  const nftTraitIndex = useMemo(() => {
    const traitIndex = new Map<string, Map<string, Set<number>>>() // traitType -> value -> Set of NFT indices
    allNFTs.forEach((nft, nftIndex) => {
      nft.attributes.forEach(attr => {
        const traitType = attr.trait_type || 'Unknown'
        const value = String(attr.value)
        if (!traitIndex.has(traitType)) {
          traitIndex.set(traitType, new Map())
        }
        const valueMap = traitIndex.get(traitType)!
        if (!valueMap.has(value)) {
          valueMap.set(value, new Set())
        }
        valueMap.get(value)!.add(nftIndex)
      })
    })
    return traitIndex
  }, [allNFTs])

  // Filter NFTs based on selected traits - optimized with pre-indexing
  // Logic: OR within same category, AND across different categories
  const filteredNFTs = useMemo(() => {
    if (selectedTraits.size === 0) {
      return allNFTs
    }
    
    // Group selected traits by category
    const traitsByCategory = new Map<string, Set<string>>()
    selectedTraits.forEach(traitKey => {
      const [traitType, value] = traitKey.split(':')
      if (!traitsByCategory.has(traitType)) {
        traitsByCategory.set(traitType, new Set())
      }
      traitsByCategory.get(traitType)!.add(value)
    })
    
    // Find all NFT indices that match at least one trait from each category
    let matchingIndices: Set<number> | null = null
    
    for (const [category, values] of traitsByCategory) {
      const categoryIndices = new Set<number>()
      const categoryMap = nftTraitIndex.get(category)
      
      if (!categoryMap) {
        // No NFTs have this category, so no matches
        return []
      }
      
      // Collect all NFT indices that have any of the selected values in this category
      for (const value of values) {
        const valueIndices = categoryMap.get(value)
        if (valueIndices) {
          valueIndices.forEach((idx: number) => categoryIndices.add(idx))
        }
      }
      
      // Intersect with previous categories (AND logic across categories)
      if (matchingIndices === null) {
        matchingIndices = new Set<number>(categoryIndices)
      } else {
        // Keep only indices that are in both sets
        matchingIndices = new Set<number>([...matchingIndices].filter((idx: number) => categoryIndices.has(idx)))
      }
      
      // Early exit if no matches
      if (matchingIndices.size === 0) {
        return []
      }
    }
    
    // Return NFTs at matching indices
    return matchingIndices ? Array.from(matchingIndices).map((idx: number) => allNFTs[idx]) : []
  }, [allNFTs, selectedTraits, nftTraitIndex])
  
  const selectedNFT = useMemo(() => {
    if (!selectedTokenId) return null
    return allNFTs.find((nft) => nft.tokenId === selectedTokenId) || null
  }, [selectedTokenId, allNFTs])

  // Pause all grid image loads when modal opens, resume when it closes
  const modalOpen = selectedTokenId !== null
  useEffect(() => {
    if (modalOpen) {
      pauseAllIPFSLoads()
    } else {
      resumeAllIPFSLoads()
    }
  }, [modalOpen])

  // Resolve ENS names for selected NFT (cached in memory + localStorage)
  useEffect(() => {
    if (!selectedNFT?.owner) return
    if (ensNames[selectedNFT.owner]) return

    resolveENSCached(selectedNFT.owner).then((name) => {
      if (name) setEnsNames((prev) => ({ ...prev, [selectedNFT!.owner!]: name }))
    })
  }, [selectedNFT?.owner, ensNames])
  
  const toggleTrait = (traitKey: string) => {
    setSelectedTraits(prev => {
      const next = new Set(prev)
      if (next.has(traitKey)) {
        next.delete(traitKey)
      } else {
        next.add(traitKey)
      }
      return next
    })
  }
  
  const clearFilters = () => {
    setSelectedTraits(new Set())
  }

  // Arrow left/right to switch between pieces when modal is open
  useEffect(() => {
    if (!selectedNFT) return
    const list = filteredNFTs
    if (list.length === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const idx = list.findIndex((nft) => nft.tokenId === selectedNFT.tokenId)
      if (e.key === 'ArrowLeft') {
        if (idx > 0) setSelectedTokenId(list[idx - 1].tokenId)
        else if (idx < 0) setSelectedTokenId(list[list.length - 1].tokenId) // current not in filter: wrap to last
      } else {
        if (idx >= 0 && idx < list.length - 1) setSelectedTokenId(list[idx + 1].tokenId)
        else if (idx < 0) setSelectedTokenId(list[0].tokenId) // current not in filter: go to first
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNFT, filteredNFTs])

  const modalNav = useMemo(() => {
    if (!selectedNFT || filteredNFTs.length === 0) return null
    const list = filteredNFTs
    const idx = list.findIndex((nft) => nft.tokenId === selectedNFT.tokenId)
    return {
      hasPrev: idx > 0 || idx < 0,
      hasNext: (idx >= 0 && idx < list.length - 1) || idx < 0,
      prevTokenId: idx > 0 ? list[idx - 1].tokenId : idx < 0 ? list[list.length - 1].tokenId : null,
      nextTokenId: (idx >= 0 && idx < list.length - 1) ? list[idx + 1].tokenId : idx < 0 ? list[0].tokenId : null,
    }
  }, [selectedNFT, filteredNFTs])

  useEffect(() => {
    if (!heroOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setHeroOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [heroOpen])

  useEffect(() => {
    if (heroOpen) setShowHeroMeta(false)
    if (!heroOpen && heroMetaStillRef.current) {
      clearTimeout(heroMetaStillRef.current)
      heroMetaStillRef.current = null
    }
  }, [heroOpen])

  const toggleCollapse = (traitType: string) => {
    setCollapsedTraits(prev => {
      const next = new Set(prev)
      if (next.has(traitType)) {
        next.delete(traitType)
      } else {
        next.add(traitType)
      }
      return next
    })
  }

  // Separate single-attribute and multi-attribute categories (hide Glitch realm from filters)
  const { singleAttributeTraits, multiAttributeTraits, bottomLevelTraits } = useMemo(() => {
    const single: Array<[string, TraitFilter[]]> = []
    const multi: Array<[string, TraitFilter[]]> = []
    
    allTraits.forEach(([traitType, traits]) => {
      if (traitType.toLowerCase() === 'glitch realm') return
      if (traits.length === 1) {
        single.push([traitType, traits])
      } else {
        multi.push([traitType, traits])
      }
    })

    const filterOrder = [
      'House',
      '1 of 1 House General',
      'State of Life',
      'Hooded',
      'Pixel Grid',
      '3 Eyes',
      'Cyclops',
      'Cat',
      'Faceless?',
      'PA Noise',
      'Twins',
    ]
    const bottomFilterTypes = new Set(['Luck Level', 'Mischief Level'].map((s) => s.toLowerCase()))
    const orderIndex = (traitType: string) => {
      const i = filterOrder.findIndex((o) => o.toLowerCase() === traitType.toLowerCase())
      return i === -1 ? 999 : i
    }
    single.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]))
    multi.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]))

    const mainMulti = multi.filter(([traitType]) => !bottomFilterTypes.has(traitType.toLowerCase()))
    const bottomLevelTraits = multi.filter(([traitType]) => bottomFilterTypes.has(traitType.toLowerCase()))

    return { 
      singleAttributeTraits: single, 
      multiAttributeTraits: mainMulti,
      bottomLevelTraits,
    }
  }, [allTraits])

  useEffect(() => {
    const scrollEl = gridScrollRef.current
    const measureEl = gridMeasureRef.current
    if (!scrollEl || !measureEl) return

    const updateMetrics = () => {
      setGridViewportHeight(scrollEl.clientHeight)
      setGridViewportWidth(measureEl.clientWidth)
      setGridScrollTop(scrollEl.scrollTop)
    }

    updateMetrics()

    const onScroll = () => setGridScrollTop(scrollEl.scrollTop)
    scrollEl.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(updateMetrics)
    resizeObserver.observe(scrollEl)
    resizeObserver.observe(measureEl)
    window.addEventListener('resize', updateMetrics)

    return () => {
      scrollEl.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateMetrics)
    }
  }, [])

  const virtualGrid = useMemo(() => {
    const count = filteredNFTs.length
    if (count === 0) {
      return {
        columns: 1,
        columnWidth: gridSize,
        rowHeight: gridSize + GRID_LABEL_HEIGHT_PX,
        totalHeight: 0,
        startIndex: 0,
        endIndex: 0,
        items: [] as CollectionNFT[],
      }
    }

    const width = Math.max(gridViewportWidth, gridSize)
    const columns = Math.max(1, Math.floor((width + GRID_GAP_PX) / (gridSize + GRID_GAP_PX)))
    const columnWidth = Math.max(80, Math.floor((width - (columns - 1) * GRID_GAP_PX) / columns))
    const rowHeight = columnWidth + GRID_LABEL_HEIGHT_PX
    const totalRows = Math.ceil(count / columns)
    const totalHeight = totalRows * rowHeight

    const startRow = Math.max(0, Math.floor(gridScrollTop / rowHeight) - GRID_OVERSCAN_ROWS)
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((gridScrollTop + Math.max(gridViewportHeight, rowHeight)) / rowHeight) + GRID_OVERSCAN_ROWS
    )
    const startIndex = startRow * columns
    const endIndex = Math.min(count, (endRow + 1) * columns)

    return {
      columns,
      columnWidth,
      rowHeight,
      totalHeight,
      startIndex,
      endIndex,
      items: filteredNFTs.slice(startIndex, endIndex),
    }
  }, [filteredNFTs, gridViewportWidth, gridViewportHeight, gridScrollTop, gridSize])

  // Smart collapsing: collapse multi-attribute traits with many options by default
  useEffect(() => {
    const autoCollapse = new Set<string>()
    ;[...multiAttributeTraits, ...bottomLevelTraits].forEach(([traitType, traits]) => {
      if (traits.length > 8) {
        autoCollapse.add(traitType)
      }
    })
    setCollapsedTraits(autoCollapse)
  }, [multiAttributeTraits, bottomLevelTraits])

  return (
    <div className="page-root text-white">
      {/* Header Section - scrollable */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto mb-6"
        >
          <motion.h1
            className="font-grotesk text-5xl md:text-7xl font-light mb-6"
            style={{
              textShadow: '0 0 20px rgba(0, 255, 0, 0.3), 2px 0 0 rgba(255, 0, 0, 0.2)',
              filter: 'contrast(1.2)',
            }}
          >
            <motion.span
              animate={{
                textShadow: [
                  '0 0 20px rgba(0, 255, 0, 0.3), 2px 0 0 rgba(255, 0, 0, 0.2)',
                  '0 0 25px rgba(0, 255, 0, 0.4), -2px 0 0 rgba(0, 0, 255, 0.3)',
                  '0 0 20px rgba(0, 255, 0, 0.3), 2px 0 0 rgba(255, 0, 0, 0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              WINIØNS
            </motion.span>
          </motion.h1>
          
          <div 
            className="mono text-sm text-[#888] mb-6 leading-relaxed max-w-3xl flicker corrupt-text relative"
            style={{
              animation: 'flicker 1.5s ease-in-out infinite, corruptText 3s ease-in-out infinite',
              textShadow: `
                0 0 4px rgba(0, 255, 0, 0.6),
                2px 0 0 rgba(255, 0, 0, 0.5),
                -2px 0 0 rgba(0, 0, 255, 0.5),
                0 2px 0 rgba(255, 255, 0, 0.4),
                1px 1px 2px rgba(255, 0, 255, 0.3)
              `,
              filter: 'contrast(1.3) brightness(1.1)',
            }}
          >
            <span style={{ 
              position: 'relative',
              display: 'inline-block',
              animation: 'textGlitch 2s ease-in-out infinite',
              transform: 'translateZ(0)',
            }}>
              Winiøns are mischievøus digital beings from a glitch realm: chaotic, cøllectible creatures that swarm wallets, bring luck, and feed on static, spreading digital mischief across art and code. To own one is to bring good fortune to your wallet. The luck is multiplicative, the more you own, the more the luck (and the mischeif) compounds.
            </span>
          </div>
          
          <div className="mono text-xs text-[#888] space-y-1 mt-6">
            <p>{allNFTs.length} {allNFTs.length === 1 ? 'TOKEN' : 'TOKENS'}</p>
            <p className="text-[10px] text-[#555]">Contract: 0x4ad94fb8b87a1ad3f7d52a406c64b56db3af0733</p>
            <p className="text-[10px] text-[#555]">Chain: Ethereum</p>
          </div>
        </motion.div>
      </div>
      
      {/* Main Content - Filters and Grid */}
      <div className="flex min-h-[calc(100vh-6rem)] relative">
        {/* Mobile backdrop overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-[#0a0a0a]/80 z-30 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Left Sidebar - Filters (sticky on desktop, scrollable independently) */}
        <div
          className={`fixed md:sticky inset-y-0 left-0 top-24 z-40 md:z-auto w-80 border-r border-[#222] bg-[#0a0a0a]/25 backdrop-blur-md transform transition-transform duration-300 h-[calc(100vh-6rem)] flex flex-col ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Sticky header */}
          <div className="p-6 space-y-6 sticky top-0 bg-[#0a0a0a]/25 backdrop-blur-md z-10 border-b border-[#222] pb-6 flex-shrink-0">
            {/* Mobile close button - positioned to never be cut off */}
            <div className="md:hidden flex justify-end mb-4 pr-2">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="mono text-sm px-4 py-2 border border-[#333] hover:border-[#555] bg-[#111] text-white hover:bg-[#1a1a1a] transition-colors"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="mono text-xs text-[#666] tracking-wider">
                [FILTERS]
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsShuffled(!isShuffled)}
                  className="mono text-[10px] px-2 py-1 border border-[#333] hover:border-[#555] text-[#888] hover:text-white transition-colors"
                >
                  {isShuffled ? '⇄ SHUFFLED' : '⇄ SHUFFLE'}
                </button>
                {selectedTraits.size > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mono text-[10px] text-[#888] hover:text-white transition-colors underline"
                  >
                    CLEAR ({selectedTraits.size})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="mono text-[10px] text-[#666] flex-shrink-0">SIZE</span>
              <input
                type="range"
                min={80}
                max={300}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full h-1 appearance-none bg-[#333] rounded-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          </div>

          {/* Scrollable filters content */}
          <div className="overflow-y-auto flex-1">
            <div className="p-6 space-y-4">
            {/* Multi-attribute categories - Collapsible (at top) */}
            {multiAttributeTraits.map(([traitType, traits]) => {
              const isCollapsed = collapsedTraits.has(traitType)
              return (
                <div key={traitType} className="border-b border-[#222] pb-4">
                  <button
                    onClick={() => toggleCollapse(traitType)}
                    className="w-full flex items-center justify-between mb-3 group"
                  >
                    <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors">
                      {traitType}
                    </div>
                    <div className="mono text-[10px] text-[#555]">
                      {isCollapsed ? '▶' : '▼'}
                    </div>
                  </button>
                  
                  {!isCollapsed && (
                    <div className="flex flex-wrap gap-2">
                      {traits.map(trait => {
                        const key = `${trait.traitType}:${trait.value}`
                        const isSelected = selectedTraits.has(key)
                        return (
                          <button
                            key={key}
                            onClick={() => toggleTrait(key)}
                            className={`mono text-[10px] px-2.5 py-1 border transition-colors ${
                              isSelected
                                ? 'border-white bg-white text-[#0a0a0a]'
                                : 'border-[#333] text-[#888] hover:border-[#555] hover:text-white'
                            }`}
                          >
                            {trait.value} <span className="text-[#555]">({trait.count})</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Single-attribute categories */}
            {singleAttributeTraits.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#222]">
                {singleAttributeTraits.map(([traitType, traits]) => {
                  const trait = traits[0]
                  const key = `${trait.traitType}:${trait.value}`
                  const isSelected = selectedTraits.has(key)
                  const isCollapsed = collapsedTraits.has(traitType)
                  return (
                    <div key={traitType} className="border-b border-[#222] pb-4 last:border-0">
                      <button
                        onClick={() => toggleCollapse(traitType)}
                        className="w-full flex items-center justify-between mb-3 group"
                      >
                        <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors">
                          {traitType}
                        </div>
                        <div className="mono text-[10px] text-[#555]">
                          {isCollapsed ? '▶' : '▼'}
                        </div>
                      </button>
                      
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleTrait(key)}
                          className={`w-full mono text-[10px] px-2.5 py-1.5 border transition-colors text-left ${
                            isSelected
                              ? 'border-white bg-white text-[#0a0a0a]'
                              : 'border-[#333] text-[#888] hover:border-[#555] hover:text-white'
                          }`}
                        >
                          {trait.value} <span className="text-[#555]">({trait.count})</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Luck Level & Mischief Level at bottom */}
            {bottomLevelTraits.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#222]">
                {bottomLevelTraits.map(([traitType, traits]) => {
                  const isCollapsed = collapsedTraits.has(traitType)
                  return (
                    <div key={traitType} className="border-b border-[#222] pb-4 last:border-0">
                      <button
                        onClick={() => toggleCollapse(traitType)}
                        className="w-full flex items-center justify-between mb-3 group"
                      >
                        <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors">
                          {traitType}
                        </div>
                        <div className="mono text-[10px] text-[#555]">
                          {isCollapsed ? '▶' : '▼'}
                        </div>
                      </button>
                      
                      {!isCollapsed && (
                        <div className="flex flex-wrap gap-2">
                          {traits.map(trait => {
                            const key = `${trait.traitType}:${trait.value}`
                            const isSelected = selectedTraits.has(key)
                            return (
                              <button
                                key={key}
                                onClick={() => toggleTrait(key)}
                                className={`mono text-[10px] px-2.5 py-1 border transition-colors ${
                                  isSelected
                                    ? 'border-white bg-white text-[#0a0a0a]'
                                    : 'border-[#333] text-[#888] hover:border-[#555] hover:text-white'
                                }`}
                              >
                                {trait.value} <span className="text-[#555]">({trait.count})</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Right Side - NFT Grid */}
        <div ref={gridScrollRef} className="flex-1 overflow-y-auto w-full">
          <div className="p-6">
            {/* Mobile filter toggle button - always visible on mobile */}
            <div className="md:hidden mb-4 flex items-center justify-between sticky top-0 z-20 bg-[#0a0a0a] pb-4 pt-2 -mt-2 -mx-6 px-6 border-b border-[#222]">
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="mono text-xs px-4 py-2 border border-[#222] hover:border-[#333] bg-[#111] text-white hover:bg-[#1a1a1a] transition-colors"
              >
                {isMobileSidebarOpen ? '✕ CLOSE FILTERS' : '☰ FILTERS'}
              </button>
            </div>
            
            {filteredNFTs.length === 0 ? (
              <div className="text-center py-20">
                <p className="mono text-sm text-[#666]">NO TOKENS MATCH SELECTED TRAITS</p>
              </div>
            ) : (
              <div ref={gridMeasureRef}>
                <div
                  className="relative"
                  style={{ height: `${virtualGrid.totalHeight}px` }}
                >
                  {virtualGrid.items.map((nft, localIndex) => {
                    const index = virtualGrid.startIndex + localIndex
                    const row = Math.floor(index / virtualGrid.columns)
                    const col = index % virtualGrid.columns
                    const top = row * virtualGrid.rowHeight
                    const left = col * (virtualGrid.columnWidth + GRID_GAP_PX)

                    return (
                      <div
                        key={nft.tokenId}
                        style={{
                          position: 'absolute',
                          top,
                          left,
                          width: virtualGrid.columnWidth,
                        }}
                      >
                    <WinionGridCardSlot
                      nft={nft}
                      onSelect={() => {
                        pauseAllIPFSLoads()
                        setSelectedTokenId(nft.tokenId)
                      }}
                    />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedNFT && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/95 backdrop-blur-sm overflow-y-auto"
          onClick={() => setSelectedTokenId(null)}
        >
          <ModalNavArrows
            hasPrev={!!modalNav?.hasPrev}
            hasNext={!!modalNav?.hasNext}
            onPrev={() => modalNav?.prevTokenId && setSelectedTokenId(modalNav.prevTokenId)}
            onNext={() => modalNav?.nextTokenId && setSelectedTokenId(modalNav.nextTokenId)}
          />
          <div className="relative max-w-4xl w-full my-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full bg-[#111] border border-[#222] p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedTokenId(null)}
                className="absolute top-4 right-4 mono text-xs text-[#666] hover:text-white transition-colors z-10 bg-[#111] px-2 py-1 border border-[#222]"
              >
                [CLOSE]
              </button>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col min-w-0 flex-shrink-0">
                <div className="relative aspect-square bg-[#0a0a0a] w-full flex-shrink-0">
                  {selectedNFT.imageUrl && !heroOpen ? (
                    <WinionImage
                      key={selectedNFT.tokenId}
                      src={selectedNFT.imageUrl}
                      alt={selectedNFT.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#111]" />
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHeroOpen(true)}
                    className="flex-1 mono text-[9px] px-2 py-1 border border-[#222] hover:border-[#444] text-[#999] hover:text-white transition-colors"
                  >
                    [FULL SCREEN]
                  </button>
                  <a
                    href={generateTwitterShareUrl({
                      title: selectedNFT.name,
                      date: new Date(),
                      ensName: selectedNFT.owner ? (ensNames[selectedNFT.owner] || null) : null,
                      tokenId: selectedNFT.tokenId,
                      collection: 'WINIØNS',
                      imageUrl: selectedNFT.imageUrl ? resolveIpfsUrl(selectedNFT.imageUrl) || selectedNFT.imageUrl : undefined,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 mono text-[9px] px-2 py-1 border border-[#222] hover:border-[#444] text-[#999] hover:text-white transition-colors text-center"
                  >
                    <svg className="inline-block w-3 h-3 mr-1 -mt-px" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    SHARE
                  </a>
                </div>
              </div>

              <div className="space-y-6 min-w-0">
                <div>
                  <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-2">{selectedNFT.name}</h2>
                </div>

                {selectedNFT.owner && (
                  <div className="mono text-xs text-[#888]">
                    OWNED BY{' '}
                    <a
                      href={`https://opensea.io/${ensNames[selectedNFT.owner]?.replace('.eth', '') || selectedNFT.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#888] transition-colors underline"
                    >
                      {ensNames[selectedNFT.owner] || `${selectedNFT.owner.slice(0, 6)}...${selectedNFT.owner.slice(-4)}`}
                    </a>
                  </div>
                )}

                {selectedNFT.description && (
                  <div className="mono text-sm text-[#888] leading-relaxed whitespace-pre-line">
                    {selectedNFT.description}
                  </div>
                )}

                {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                  <div>
                    <div className="mono text-xs text-[#666] mb-3">ATTRIBUTES</div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNFT.attributes.map((attr: NFTAttribute, idx: number) => (
                        <div key={idx} className="mono text-xs text-[#888] border border-[#222] p-2">
                          <div className="text-[#666]">{attr.trait_type}</div>
                          <div>{attr.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </motion.div>
          </div>

          {/* Hero fullscreen overlay */}
          {heroOpen && selectedNFT?.imageUrl && (
            <div
              className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a] min-w-0 min-h-0 overflow-hidden"
              onClick={(e) => { e.stopPropagation(); setHeroOpen(false) }}
            >
              <ModalNavArrows
                hasPrev={!!modalNav?.hasPrev}
                hasNext={!!modalNav?.hasNext}
                onPrev={() => modalNav?.prevTokenId && setSelectedTokenId(modalNav.prevTokenId)}
                onNext={() => modalNav?.nextTokenId && setSelectedTokenId(modalNav.nextTokenId)}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setHeroOpen(false) }}
                className="absolute top-4 right-4 z-10 mono text-xs text-[#666] hover:text-white px-2 py-1 border border-[#222] bg-[#111]"
              >
                [CLOSE]
              </button>
              <div
                className="flex-1 min-h-0 flex items-center justify-center p-4 relative"
                onClick={(e) => e.stopPropagation()}
                onMouseMove={() => {
                  setShowHeroMeta(true)
                  if (heroMetaStillRef.current) clearTimeout(heroMetaStillRef.current)
                  heroMetaStillRef.current = setTimeout(() => setShowHeroMeta(false), 80)
                }}
                onTouchStart={() => setShowHeroMeta(true)}
                onTouchEnd={() => setShowHeroMeta(false)}
              >
                <div className={`w-full h-full min-w-0 min-h-0 max-w-full max-h-full transition-opacity duration-200 ${showHeroMeta ? 'opacity-40' : 'opacity-100'}`}>
                  <SmartIPFSImage
                    key={selectedNFT.tokenId}
                    src={selectedNFT.imageUrl}
                    alt={selectedNFT.name}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <div className={`absolute inset-0 flex items-center justify-center bg-black/70 transition-opacity duration-200 pointer-events-none p-8 ${showHeroMeta ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="mono text-left text-sm text-[#ccc] space-y-3 max-w-md [pointer-events:auto]">
                    <div className="font-grotesk text-white text-xl font-light tracking-tighter">{selectedNFT.name}</div>
                    {selectedNFT.owner && (
                      <div>
                        <span className="text-[#666]">OWNED BY:</span>{' '}
                        <a
                          href={`https://opensea.io/${ensNames[selectedNFT.owner]?.replace('.eth', '') || selectedNFT.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ccc] hover:text-white underline transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ensNames[selectedNFT.owner] || `${selectedNFT.owner.slice(0, 6)}...${selectedNFT.owner.slice(-4)}`}
                        </a>
                      </div>
                    )}
                    {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                      <div>
                        <span className="text-[#666]">ATTRIBUTES:</span>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {selectedNFT.attributes.map((attr: NFTAttribute, idx: number) => (
                            <div key={idx} className="text-[#888] border border-[#222] p-2">
                              <div className="text-[#666] text-xs">{attr.trait_type}</div>
                              <div className="text-xs">{attr.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 border-t border-[#222] bg-[#0a0a0a] px-4 py-3 text-center">
                <div className="font-grotesk text-white font-light tracking-tighter">{selectedNFT.name}</div>
                <div className="mono text-xs text-[#666] mt-0.5">
                  {selectedNFT.owner ? (
                    <>
                      OWNED BY{' '}
                      <a
                        href={`https://opensea.io/${ensNames[selectedNFT.owner]?.replace('.eth', '') || selectedNFT.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#888] hover:text-white underline transition-colors"
                      >
                        {ensNames[selectedNFT.owner] || `${selectedNFT.owner.slice(0, 6)}...${selectedNFT.owner.slice(-4)}`}
                      </a>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
