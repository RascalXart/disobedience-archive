'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getAllWinionsNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'
import { generateTwitterShareUrl } from '@/lib/twitter-share'
import { resolveENSCached } from '@/lib/ens-cache'
import { ModalNavArrows } from '@/components/ModalNavArrows'
import type { CollectionNFT, NFTAttribute } from '@/types'

// Gateways that work in browser (no filebase - it throws ERR_SSL_PROTOCOL_ERROR)
const PRIMARY_GATEWAY = 'https://ipfs.io/ipfs/'
const FALLBACK_GATEWAYS = [
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
]

const IPFS_GATEWAYS = [PRIMARY_GATEWAY, ...FALLBACK_GATEWAYS]

// Generate path variations to try when original fails
function generateIpfsPathVariations(originalUrl: string): string[] {
  const match = originalUrl.match(/\/ipfs\/([^?]+)/)
  if (!match) return [originalUrl]
  
  const cidAndPath = match[1]
  const parts = cidAndPath.split('/')
  const cid = parts[0]
  const originalPath = parts.slice(1).join('/')
  
  const variations: string[] = [cidAndPath] // Always try original first
  
  // If path exists, try common variations
  if (originalPath) {
    // Try CID root (common fallback)
    variations.push(cid)
    
    // Try with common path prefixes
    const pathParts = originalPath.split('/')
    if (pathParts.length > 1) {
      // Try without last segment (e.g., /media -> /)
      variations.push(`${cid}/${pathParts.slice(0, -1).join('/')}`)
    }
    
    // Try with 'media' prefix if not already present
    if (!originalPath.includes('media')) {
      variations.push(`${cid}/media/${originalPath}`)
    }
  }
  
  return Array.from(new Set(variations))
}

// Static image component - load when in viewport (Intersection Observer), fallback gateways on error
function StaticWinionImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const originalResolved = resolveIpfsUrl(src) || src
  const pathVariations = useMemo(() => {
    if (!originalResolved.includes('ipfs')) return []
    return generateIpfsPathVariations(originalResolved)
  }, [originalResolved])
  
  const [gatewayIndex, setGatewayIndex] = useState(0)
  const [pathIndex, setPathIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  const cancelAllLoads = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    setShouldLoad(false)
    setIsVisible(false)
    setIsLoading(false)
  }, [])
  
  // Build current URL - convert GIF to static if needed
  const currentSrc = useMemo(() => {
    if (!shouldLoad) return ''
    const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0]
    const path = pathVariations[pathIndex] || pathVariations[0]
    let url = `${gateway}${path}`
    
    // If it's a GIF, we'll let the browser handle it but stop animation
    // For now, just use the URL as-is (browser will show first frame)
    return url
  }, [gatewayIndex, pathIndex, pathVariations, shouldLoad])

  // Extract IPFS hash and path from a failed URL
  const extractIpfsHash = useCallback((failedUrl: string): { cid: string; path: string } | null => {
    const match = failedUrl.match(/\/ipfs\/([^?]+)/)
    if (!match) return null
    
    const cidAndPath = match[1]
    const parts = cidAndPath.split('/')
    const cid = parts[0]
    const path = parts.slice(1).join('/')
    
    return { cid, path }
  }, [])

  const handleError = useCallback((e?: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Only retry if image is still visible and should be loading
    if (!mounted || !shouldLoad || !isVisible) {
      cancelAllLoads()
      return
    }
    
    // Check if still in viewport before retrying
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const stillInViewport = rect.top < window.innerHeight + 100 && rect.bottom > -100
      if (!stillInViewport) {
        cancelAllLoads()
        return
      }
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // If current gateway is filebase.io and it failed, try fallback gateways
    const currentGateway = IPFS_GATEWAYS[gatewayIndex]
    if (currentGateway === PRIMARY_GATEWAY && e?.currentTarget?.src) {
      const hashInfo = extractIpfsHash(e.currentTarget.src)
      if (hashInfo) {
        // Try first fallback gateway that hasn't been tried yet
        for (const fallbackGateway of FALLBACK_GATEWAYS) {
          // Skip if this gateway was already tried (check if src contains it)
          if (e.currentTarget.src.includes(fallbackGateway)) continue
          
          const fallbackUrl = `${fallbackGateway}${hashInfo.cid}${hashInfo.path ? '/' + hashInfo.path : ''}`
          
          // Find the gateway index in IPFS_GATEWAYS
          const newGatewayIndex = IPFS_GATEWAYS.findIndex(g => g === fallbackGateway)
          if (newGatewayIndex >= 0) {
            retryTimeoutRef.current = setTimeout(() => {
              // Check again if still visible before retrying
              if (!isVisible || !shouldLoad) {
                cancelAllLoads()
                return
              }
              setGatewayIndex(newGatewayIndex)
              setPathIndex(0)
              setIsLoading(true)
              // Update the image src directly
              if (imgRef.current) {
                imgRef.current.src = fallbackUrl
              }
            }, 300)
            return
          }
        }
      }
    }

    // Try next path variation first
    if (pathIndex + 1 < pathVariations.length) {
      retryTimeoutRef.current = setTimeout(() => {
        // Check again if still visible before retrying
        if (!isVisible || !shouldLoad) {
          cancelAllLoads()
          return
        }
        setPathIndex(pathIndex + 1)
        setIsLoading(true)
      }, 500)
      return
    }
    
    // Try next gateway
    if (gatewayIndex + 1 < IPFS_GATEWAYS.length) {
      retryTimeoutRef.current = setTimeout(() => {
        // Check again if still visible before retrying
        if (!isVisible || !shouldLoad) {
          cancelAllLoads()
          return
        }
        setGatewayIndex(gatewayIndex + 1)
        setPathIndex(0)
        setIsLoading(true)
      }, 800)
      return
    }
    
    // Never give up - cycle back to start and keep trying (only if still visible)
    retryTimeoutRef.current = setTimeout(() => {
      // Check again if still visible before retrying
      if (!isVisible || !shouldLoad) {
        cancelAllLoads()
        return
      }
      setGatewayIndex(0)
      setPathIndex(0)
      setIsLoading(true)
      // Update the image src to retry
      if (imgRef.current && pathVariations.length > 0) {
        const firstGateway = IPFS_GATEWAYS[0]
        const firstPath = pathVariations[0] || ''
        imgRef.current.src = `${firstGateway}${firstPath}`
      }
    }, 2000) // Wait 2 seconds before retrying from the beginning
  }, [pathIndex, pathVariations.length, gatewayIndex, mounted, shouldLoad, isVisible, extractIpfsHash, pathVariations, cancelAllLoads])

  useEffect(() => {
    setMounted(true)
    // Don't auto-load - use Intersection Observer for lazy loading only
  }, [])

  // Reset everything when src changes (e.g., filter/shuffle changes)
  useEffect(() => {
    cancelAllLoads()
    setGatewayIndex(0)
    setPathIndex(0)
    setIsLoading(true)
    setShouldLoad(false)
    setIsVisible(false)
  }, [src, cancelAllLoads])

  useEffect(() => {
    if (!shouldLoad || !currentSrc || !isVisible) return
    
    setIsLoading(true)
    timeoutRef.current = setTimeout(() => {
      // Check if still visible before timing out
      if (!isVisible || !shouldLoad) {
        cancelAllLoads()
        return
      }
      if (imgRef.current && !imgRef.current.complete) {
        // Create a synthetic event for timeout errors
        const syntheticEvent = {
          currentTarget: imgRef.current,
        } as React.SyntheticEvent<HTMLImageElement, Event>
        handleError(syntheticEvent)
      }
    }, 6000) // 6 second timeout per attempt

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [currentSrc, shouldLoad, isVisible, handleError, cancelAllLoads])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllLoads()
    }
  }, [cancelAllLoads])
  
  // Intersection Observer: load only when in or near viewport (browser handles connection limits)
  useEffect(() => {
    if (!mounted) return
    if (!containerRef.current) return
    
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    
    const checkViewport = () => {
      if (!containerRef.current) return false
      const rect = containerRef.current.getBoundingClientRect()
      return rect.top < window.innerHeight + 300 && rect.bottom > -300
    }
    
    const isInViewport = checkViewport()
    setIsVisible(isInViewport)
    if (isInViewport && !shouldLoad) setShouldLoad(true)
    if (!isInViewport && shouldLoad) cancelAllLoads()
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        const nowVisible = entry.isIntersecting
        setIsVisible(nowVisible)
        if (nowVisible && !shouldLoad) setShouldLoad(true)
        if (!nowVisible && shouldLoad) cancelAllLoads()
      },
      { rootMargin: '300px', threshold: 0.01 }
    )
    observerRef.current.observe(containerRef.current)
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [mounted, shouldLoad, cancelAllLoads])
  
  const handleLoad = useCallback(() => {
    if (!mounted || !shouldLoad) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsLoading(false)
  }, [mounted, shouldLoad])

  // Update styles after mount to prevent hydration issues
  useEffect(() => {
    if (!mounted || !containerRef.current) return
    
    const placeholder = containerRef.current.querySelector('.winion-placeholder') as HTMLElement
    const loadingOverlay = containerRef.current.querySelector('.winion-loading') as HTMLElement
    const img = containerRef.current.querySelector('img') as HTMLImageElement
    
    if (placeholder) {
      placeholder.style.display = (shouldLoad && currentSrc) ? 'none' : 'block'
    }
    if (loadingOverlay) {
      loadingOverlay.style.display = (shouldLoad && isLoading) ? 'block' : 'none'
    }
    if (img) {
      img.style.opacity = (shouldLoad && !isLoading && currentSrc) ? '1' : '0'
      if (shouldLoad && currentSrc) {
        img.src = currentSrc
      }
    }
  }, [mounted, shouldLoad, currentSrc, isLoading])

  // Never show "NO IMAGE" - keep retrying indefinitely
  // hasError is no longer used, we just keep trying

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div 
        className="absolute inset-0 bg-[#111] w-full h-full winion-placeholder"
        style={{ zIndex: 1, display: 'block' }}
      />
      <div 
        className="absolute inset-0 bg-[#111] w-full h-full winion-loading"
        style={{ zIndex: 2, display: 'none' }}
      />
      <img
        ref={imgRef}
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={(e) => handleError(e)}
        onLoad={handleLoad}
        style={{
          opacity: 0,
          transition: 'opacity 0.3s ease-in',
          position: 'relative',
          zIndex: 0,
          // Prevent GIF animation - show only first frame
          imageRendering: 'crisp-edges',
        }}
        suppressHydrationWarning
      />
    </div>
  )
}

interface TraitFilter {
  traitType: string
  value: string
  count: number
}

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
  const [visibleCount, setVisibleCount] = useState(50) // Start with 50 images per page
  const [isShuffled, setIsShuffled] = useState(false)
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})
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
  const { singleAttributeTraits, multiAttributeTraits } = useMemo(() => {
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
      'Luck Level',
      'Mischief Level',
    ]
    const orderIndex = (traitType: string) => {
      const i = filterOrder.findIndex((o) => o.toLowerCase() === traitType.toLowerCase())
      return i === -1 ? 999 : i
    }
    single.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]))
    multi.sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]))

    return { 
      singleAttributeTraits: single, 
      multiAttributeTraits: multi
    }
  }, [allTraits])

  // Smart collapsing: collapse multi-attribute traits with many options by default
  useEffect(() => {
    const autoCollapse = new Set<string>()
    multiAttributeTraits.forEach(([traitType, traits]) => {
      if (traits.length > 8) {
        autoCollapse.add(traitType)
      }
    })
    setCollapsedTraits(autoCollapse)
  }, [multiAttributeTraits])

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
          className={`fixed md:sticky inset-y-0 left-0 top-24 z-40 md:z-auto w-80 border-r border-[#222] bg-[#0a0a0a]/95 backdrop-blur-sm transform transition-transform duration-300 h-[calc(100vh-6rem)] flex flex-col ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Sticky header */}
          <div className="p-6 space-y-6 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-10 border-b border-[#222] pb-6 flex-shrink-0">
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

            {/* Single-attribute categories - Collapsible (at bottom) */}
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
            </div>
          </div>
        </div>

        {/* Right Side - NFT Grid */}
        <div className="flex-1 overflow-y-auto w-full">
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredNFTs.slice(0, visibleCount).map((nft, index) => {
                    // Create a key that changes when shuffle/filters change to force component reset
                    const filterKey = Array.from(selectedTraits).sort().join(',')
                    const uniqueKey = `${nft.tokenId}-${isShuffled ? 'shuffled' : 'sorted'}-${filterKey}-${index}`
                    return (
                  <motion.div
                    key={uniqueKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedTokenId(nft.tokenId)}
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors">
                      {nft.imageUrl ? (
                        <StaticWinionImage
                          key={uniqueKey}
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
                  })}
                </div>
                {filteredNFTs.length > visibleCount && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => Math.min(prev + 50, filteredNFTs.length))}
                      className="mono text-xs px-6 py-3 border border-[#222] hover:border-[#333] transition-colors bg-[#111] text-[#888] hover:text-white"
                    >
                      LOAD MORE ({filteredNFTs.length - visibleCount} REMAINING)
                    </button>
                  </div>
                )}
              </>
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
                  {selectedNFT.imageUrl ? (
                    <StaticWinionImage
                      src={selectedNFT.imageUrl}
                      alt={selectedNFT.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#111]" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setHeroOpen(true)}
                  className="mt-2 mono text-[9px] px-2 py-1 border border-[#222] hover:border-[#444] text-[#666] hover:text-white transition-colors"
                >
                  [FULL SCREEN]
                </button>
                
                {/* Twitter Share Button */}
                <a
                  href={generateTwitterShareUrl({
                    title: selectedNFT.name,
                    date: new Date(), // NFTs don't have dates, use current date
                    ensName: selectedNFT.owner ? (ensNames[selectedNFT.owner] || null) : null,
                    tokenId: selectedNFT.tokenId,
                    collection: 'WINIØNS',
                    imageUrl: selectedNFT.imageUrl ? resolveIpfsUrl(selectedNFT.imageUrl) || selectedNFT.imageUrl : undefined,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-2 py-1 text-center font-grotesk font-light bg-[#111] text-[#999] border border-[#222] hover:border-[#333] hover:text-white transition-colors mono text-[9px]"
                >
                  SHARE TO TWITTER
                </a>
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
                  <img
                    src={resolveIpfsUrl(selectedNFT.imageUrl) || selectedNFT.imageUrl}
                    alt={selectedNFT.name}
                    className="w-full h-full object-contain"
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
