'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getAllWinionsNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'
import type { CollectionNFT, NFTAttribute } from '@/types'

// Primary gateway: ipfs.filebase.io
// Fallback gateways for SSL errors
const PRIMARY_GATEWAY = 'https://ipfs.filebase.io/ipfs/'
const FALLBACK_GATEWAYS = [
  'https://cf-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
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

// Static image component - extracts first frame from GIF or uses static image
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
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
    if (!mounted || !shouldLoad) return
    
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
            setTimeout(() => {
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
      setTimeout(() => {
        setPathIndex(pathIndex + 1)
        setIsLoading(true)
      }, 500)
      return
    }
    
    // Try next gateway
    if (gatewayIndex + 1 < IPFS_GATEWAYS.length) {
      setTimeout(() => {
        setGatewayIndex(gatewayIndex + 1)
        setPathIndex(0)
        setIsLoading(true)
      }, 800)
      return
    }
    
    // Never give up - cycle back to start and keep trying
    // Reset to first gateway and first path, then retry
    setTimeout(() => {
      setGatewayIndex(0)
      setPathIndex(0)
      setIsLoading(true)
      // Update the image src to retry
      if (imgRef.current && currentSrc) {
        const firstGateway = IPFS_GATEWAYS[0]
        const firstPath = pathVariations[0] || ''
        imgRef.current.src = `${firstGateway}${firstPath}`
      }
    }, 2000) // Wait 2 seconds before retrying from the beginning
  }, [pathIndex, pathVariations.length, gatewayIndex, mounted, shouldLoad, extractIpfsHash, currentSrc, pathVariations])

  useEffect(() => {
    setMounted(true)
    // Don't auto-load - use Intersection Observer for lazy loading only
  }, [])

  useEffect(() => {
    setGatewayIndex(0)
    setPathIndex(0)
    setIsLoading(true)
  }, [src])

  useEffect(() => {
    if (!shouldLoad || !currentSrc) return
    
    setIsLoading(true)
    const timeout = setTimeout(() => {
      if (imgRef.current && !imgRef.current.complete) {
        // Create a synthetic event for timeout errors
        const syntheticEvent = {
          currentTarget: imgRef.current,
        } as React.SyntheticEvent<HTMLImageElement, Event>
        handleError(syntheticEvent)
      }
    }, 6000) // 6 second timeout per attempt

    return () => {
      clearTimeout(timeout)
    }
  }, [currentSrc, shouldLoad, handleError])
  
  // Intersection Observer for lazy loading - only load images in or near viewport
  useEffect(() => {
    if (!mounted) return
    if (shouldLoad) return
    if (!containerRef.current) return
    
    let observer: IntersectionObserver | null = null
    
    const checkAndObserve = () => {
      if (!containerRef.current) return
      if (shouldLoad) return
      
      // Check if already in viewport (with small margin)
      const rect = containerRef.current.getBoundingClientRect()
      const isInViewport = rect.top < window.innerHeight + 50 && rect.bottom > -50
      if (isInViewport) {
        setShouldLoad(true)
        return
      }
      
      // Set up observer for images not yet in viewport
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !shouldLoad) {
            setShouldLoad(true)
            if (observer) {
              observer.disconnect()
              observer = null
            }
          }
        },
        { 
          rootMargin: '50px', // Only start loading 50px before entering viewport
          threshold: 0.01 
        }
      )

      if (containerRef.current) {
        observer.observe(containerRef.current)
      }
    }
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(checkAndObserve, 100)
    
    return () => {
      clearTimeout(timer)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [shouldLoad, mounted])
  
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
  // Sort by tokenId initially
  const sortedNFTs = useMemo(() => {
    return [...allNFTsRaw].sort((a, b) => {
      const idA = parseInt(a.tokenId) || 0
      const idB = parseInt(b.tokenId) || 0
      return idA - idB
    })
  }, [allNFTsRaw])
  
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set())
  const [collapsedTraits, setCollapsedTraits] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(50) // Start with 50 images per page
  const [isShuffled, setIsShuffled] = useState(false)
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})
  
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
  
  // Filter NFTs based on selected traits
  // Logic: OR within same category, AND across different categories
  const filteredNFTs = useMemo(() => {
    if (selectedTraits.size === 0) {
      return allNFTs
    }
    
    // Group selected traits by category
    const traitsByCategory = new Map<string, Set<string>>()
    selectedTraits.forEach(traitKey => {
      const [traitType] = traitKey.split(':')
      if (!traitsByCategory.has(traitType)) {
        traitsByCategory.set(traitType, new Set())
      }
      traitsByCategory.get(traitType)!.add(traitKey)
    })
    
    return allNFTs.filter(nft => {
      // Build NFT's trait keys
      const nftTraitKeys = new Set(
        nft.attributes.map(attr => 
          `${attr.trait_type || 'Unknown'}:${attr.value}`
        )
      )
      
      // For each category with selected traits, NFT must have at least ONE trait from that category (OR logic)
      // Across different categories, NFT must match ALL categories (AND logic)
      for (const [category, traitKeys] of traitsByCategory) {
        // Check if NFT has at least one trait from this category
        let hasTraitFromCategory = false
        for (const traitKey of traitKeys) {
          if (nftTraitKeys.has(traitKey)) {
            hasTraitFromCategory = true
            break
          }
        }
        
        // If NFT doesn't have any trait from this category, it fails the filter
        if (!hasTraitFromCategory) {
          return false
        }
      }
      
      return true
    })
  }, [allNFTs, selectedTraits])
  
  const selectedNFT = useMemo(() => {
    if (!selectedTokenId) return null
    return allNFTs.find((nft) => nft.tokenId === selectedTokenId) || null
  }, [selectedTokenId, allNFTs])

  // Resolve ENS names for selected NFT
  useEffect(() => {
    if (!selectedNFT?.owner) return
    if (ensNames[selectedNFT.owner]) return
    
    const resolveENS = async (address: string) => {
      try {
        const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`)
        if (response.ok) {
          const data = await response.json()
          if (data.name) {
            setEnsNames(prev => ({ ...prev, [address]: data.name }))
            return
          }
        }
      } catch (e) {
        try {
          const { ethers } = await import('ethers')
          const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com')
          const name = await provider.lookupAddress(address)
          if (name) {
            setEnsNames(prev => ({ ...prev, [address]: name }))
          }
        } catch (err) {
          // ENS resolution failed
        }
      }
    }
    
    resolveENS(selectedNFT.owner)
  }, [selectedNFT, ensNames])
  
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

  // Separate single-attribute, multi-attribute, and "Glitch realm" categories
  const { singleAttributeTraits, multiAttributeTraits, glitchRealm } = useMemo(() => {
    const single: Array<[string, TraitFilter[]]> = []
    const multi: Array<[string, TraitFilter[]]> = []
    let glitch: [string, TraitFilter[]] | null = null
    
    allTraits.forEach(([traitType, traits]) => {
      if (traitType.toLowerCase() === 'glitch realm') {
        glitch = [traitType, traits]
      } else if (traits.length === 1) {
        single.push([traitType, traits])
      } else {
        multi.push([traitType, traits])
      }
    })
    
    return { 
      singleAttributeTraits: single, 
      multiAttributeTraits: multi,
      glitchRealm: glitch
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
      <div className="flex h-[calc(100vh-6rem)]">
        {/* Left Sidebar - Filters */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-80 border-r border-[#222] overflow-y-auto bg-[#0a0a0a]"
        >
          <div className="p-6 space-y-6 sticky top-0 bg-[#0a0a0a] z-10 border-b border-[#222] pb-6">
            <div>
              <motion.h1
                className="font-grotesk text-3xl md:text-4xl font-light mb-4"
                style={{
                  textShadow: '0 0 20px rgba(0, 255, 0, 0.3), 2px 0 0 rgba(255, 0, 0, 0.2)',
                  filter: 'contrast(1.2)',
                }}
              >
                WINIØNS
              </motion.h1>
              
              <div className="mono text-xs text-[#888] space-y-1">
                <p>{allNFTs.length} {allNFTs.length === 1 ? 'TOKEN' : 'TOKENS'}</p>
                <p className="text-[10px] text-[#555]">Contract: 0x4ad94fb8b87a1ad3f7d52a406c64b56db3af0733</p>
                <p className="text-[10px] text-[#555]">Chain: Ethereum</p>
              </div>
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

            <div className="mono text-xs text-[#666] tracking-wider border-t border-[#222] pt-4">
              [{filteredNFTs.length} {filteredNFTs.length === 1 ? 'RESULT' : 'RESULTS'}]
            </div>
          </div>

          {/* Trait Filters */}
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

            {/* Glitch realm - Above single categories */}
            {glitchRealm ? (() => {
              const [traitType, traits] = glitchRealm as [string, TraitFilter[]]
              const isCollapsed = collapsedTraits.has(traitType)
              return (
                <div key="glitch-realm" className="border-b border-[#222] pb-4 pt-4 border-t border-[#222]">
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
            })() : null}

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
        </motion.div>

        {/* Right Side - NFT Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {filteredNFTs.length === 0 ? (
              <div className="text-center py-20">
                <p className="mono text-sm text-[#666]">NO TOKENS MATCH SELECTED TRAITS</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredNFTs.slice(0, visibleCount).map((nft, index) => (
                  <motion.div
                    key={nft.tokenId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedTokenId(nft.tokenId)}
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors">
                      {nft.imageUrl ? (
                        <StaticWinionImage
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
                  ))}
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
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-4xl w-full bg-[#111] border border-[#222] p-8 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTokenId(null)}
              className="sticky top-4 float-right mono text-xs text-[#666] hover:text-white transition-colors z-10 bg-[#111] px-2 py-1"
            >
              [CLOSE]
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="relative aspect-square bg-[#0a0a0a]">
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

              <div className="space-y-6">
                <div>
                  <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-2">{selectedNFT.name}</h2>
                  <div className="mono text-xs text-[#666]">Token #{selectedNFT.tokenId}</div>
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
        </motion.div>
      )}
    </div>
  )
}
