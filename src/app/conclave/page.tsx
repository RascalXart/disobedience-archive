'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getAllCollectionNFTs, getCollection, getSpecialCollectionNFTs, getRegularCollectionNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'
import { generateTwitterShareUrl } from '@/lib/twitter-share'
import { resolveENSCached } from '@/lib/ens-cache'
import { ModalNavArrows } from '@/components/ModalNavArrows'
import { SmartIPFSImage, pauseAllIPFSLoads, resumeAllIPFSLoads } from '@/components/SmartIPFSImage'
import { useProgressiveLoader } from '@/lib/progressive-loader'
import Link from 'next/link'
import type { CollectionNFT } from '@/types'

/** Grid slot: SmartIPFSImage with label. */
function ConclaveGridCardSlot({
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
      <div className="mt-3">
        <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors">
          {nft.name}
        </div>
        <div className="mono text-[10px] text-[#555]">Token #{nft.tokenId}</div>
      </div>
    </motion.div>
  )
}

export default function ConclavePage() {
  const collection = getCollection()
  const specialNFTs = getSpecialCollectionNFTs()
  const regularNFTs = getRegularCollectionNFTs()
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [heroOpen, setHeroOpen] = useState(false)
  const [showHeroMeta, setShowHeroMeta] = useState(false)
  const heroMetaStillRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})
  const [isShuffled, setIsShuffled] = useState(false)
  
  // Sort regular NFTs by tokenId initially
  const sortedRegularNFTs = useMemo(() => {
    return [...regularNFTs].sort((a, b) => {
      const idA = parseInt(a.tokenId) || 0
      const idB = parseInt(b.tokenId) || 0
      return idA - idB
    })
  }, [regularNFTs])
  
  // Shuffle or sort regular NFTs
  const displayRegularNFTs = useMemo(() => {
    if (isShuffled) {
      // Fisher-Yates shuffle
      const shuffled = [...sortedRegularNFTs]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    return sortedRegularNFTs
  }, [sortedRegularNFTs, isShuffled])
  
  // Memoize allNFTs to prevent dependency issues
  const allNFTs = useMemo(() => [...specialNFTs, ...displayRegularNFTs], [specialNFTs, displayRegularNFTs])

  const {
    visibleItems,
    hasMore,
    sentinelRef,
  } = useProgressiveLoader(displayRegularNFTs, 12)

  const popeDoom = useMemo(() => 
    specialNFTs.find(nft => 
      nft.name && (nft.name.includes('Pope Doom') || nft.name.includes('Pøpe Døøm') || nft.name.includes('POPE DOOM'))
    ),
    [specialNFTs]
  )
  
  const clippius = useMemo(() =>
    specialNFTs.find(nft => 
      nft.name && (nft.name.includes('Clippius') || nft.name.includes('CLIPPIUS') || nft.name.includes('Murdered Pope'))
    ),
    [specialNFTs]
  )
  
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

  // Resolve ENS names (cached in memory + localStorage)
  useEffect(() => {
    const run = async (address: string) => {
      if (!address || ensNames[address]) return
      const name = await resolveENSCached(address)
      if (name) setEnsNames((prev) => ({ ...prev, [address]: name }))
    }
    if (popeDoom?.owner) run(popeDoom.owner)
    if (clippius?.owner) run(clippius.owner)
  }, [popeDoom?.owner, clippius?.owner, ensNames])
  
  useEffect(() => {
    if (!selectedNFT?.owner) return
    if (ensNames[selectedNFT.owner]) return

    resolveENSCached(selectedNFT.owner).then((name) => {
      if (name) setEnsNames((prev) => ({ ...prev, [selectedNFT!.owner!]: name }))
    })
  }, [selectedNFT?.owner, ensNames])

  // Arrow left/right to switch between pieces when modal is open
  useEffect(() => {
    if (!selectedNFT) return
    const list = allNFTs
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const idx = list.findIndex((nft) => nft.tokenId === selectedNFT.tokenId)
      if (idx < 0) return
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault()
        setSelectedTokenId(list[idx - 1].tokenId)
      } else if (e.key === 'ArrowRight' && idx < list.length - 1) {
        e.preventDefault()
        setSelectedTokenId(list[idx + 1].tokenId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNFT, allNFTs])

  const modalNav = useMemo(() => {
    if (!selectedNFT || allNFTs.length === 0) return null
    const idx = allNFTs.findIndex((nft) => nft.tokenId === selectedNFT.tokenId)
    if (idx < 0) return null
    return {
      hasPrev: idx > 0,
      hasNext: idx < allNFTs.length - 1,
      prevTokenId: idx > 0 ? allNFTs[idx - 1].tokenId : null,
      nextTokenId: idx < allNFTs.length - 1 ? allNFTs[idx + 1].tokenId : null,
    }
  }, [selectedNFT, allNFTs])

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

  return (
    <div className="page-root text-white">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-16">
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
                CØNCLAVE
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
                whispers echo in the chamber<br />
                the eternal conclave gathers.<br />
                each cardinal minted, holy,<br />
                (a dark glimmer in their eye)<br />
                deciding with a single vote,<br />
                the fate of the pøpe of web3.
              </span>
            </div>
            
            {collection?.description && (
              <div className="mono text-sm text-[#888] mb-6 leading-relaxed max-w-3xl">
                {collection?.description}
              </div>
            )}
            
            <div className="mono text-sm text-[#888] mb-12 space-y-2">
              <p>{collection?.totalSupply} {collection?.totalSupply === 1 ? 'TOKEN' : 'TOKENS'}</p>
              <p>Created: May 2025</p>
              <p className="text-[10px] text-[#555]">Contract: {collection?.contractAddress}</p>
              <p className="text-[10px] text-[#555]">Chain: {collection?.chain?.toUpperCase()}</p>
            </div>

            {/* Pope Doom */}
            {popeDoom && (
              <div className="mb-16 border-b border-[#222] pb-16">
                <div className="mono text-xs text-[#666] mb-6 tracking-wider">[CURRENT_POPE]</div>
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div className="relative aspect-square overflow-hidden bg-[#111] border-2 border-[#444]">
                    {popeDoom.imageUrl ? (
                      <SmartIPFSImage
                        src={popeDoom.imageUrl}
                        alt={popeDoom.name}
                        className="w-full h-full object-contain"
                        eager
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111]" />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="mono text-[10px] text-[#666] mb-2 tracking-wider">
                      THE CURRENT POPE OF WEB3 DECIDED IN 2025 BY {collection?.totalSupply} CARDINALS
                    </div>
                    <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-4">{popeDoom.name}</h2>
                    {popeDoom.owner && (
                      <div className="mono text-xs text-[#888]">
                        OWNED BY{' '}
                        <a
                          href={`https://opensea.io/${ensNames[popeDoom.owner]?.replace('.eth', '') || popeDoom.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-[#888] transition-colors underline"
                        >
                          {ensNames[popeDoom.owner] || `${popeDoom.owner.slice(0, 6)}...${popeDoom.owner.slice(-4)}`}
                        </a>
                      </div>
                    )}
                    {popeDoom.description && (
                      <div className="mono text-sm text-[#888] leading-relaxed mt-6 whitespace-pre-line">
                        {popeDoom.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Clippius */}
            {clippius && (
              <div className="mb-16 border-b border-[#222] pb-16">
                <div className="mono text-xs text-[#666] mb-6 tracking-wider">[MURDERED_POPE]</div>
                <div className="grid md:grid-cols-3 gap-8 items-start">
                  <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#333] max-w-xs">
                    {clippius.imageUrl ? (
                      <SmartIPFSImage
                        src={clippius.imageUrl}
                        alt={clippius.name}
                        className="w-full h-full object-contain"
                        eager
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111]" />
                    )}
                  </div>
                  
                  <div className="md:col-span-2 space-y-4">
                    <div className="mono text-[10px] text-[#666] mb-2 tracking-wider">THE MURDERED POPE OF WEB3</div>
                    <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-4">{clippius.name}</h2>
                    {clippius.owner && (
                      <div className="mono text-xs text-[#888]">
                        OWNED BY{' '}
                        <a
                          href={`https://opensea.io/${ensNames[clippius.owner]?.replace('.eth', '') || clippius.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-[#888] transition-colors underline"
                        >
                          {ensNames[clippius.owner] || `${clippius.owner.slice(0, 6)}...${clippius.owner.slice(-4)}`}
                        </a>
                      </div>
                    )}
                    {clippius.description && (
                      <div className="mono text-sm text-[#888] leading-relaxed mt-6 whitespace-pre-line">
                        {clippius.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* All Tokens Grid */}
          {displayRegularNFTs.length === 0 && specialNFTs.length === 0 ? (
            <div className="text-center py-20">
              <p className="mono text-sm text-[#666]">NO TOKENS FOUND</p>
            </div>
          ) : displayRegularNFTs.length > 0 ? (
            <>
              <div className="mono text-xs text-[#666] mb-6 tracking-wider border-b border-[#222] pb-2 flex items-center justify-between">
                <span>[ALL_TOKENS]</span>
                <button
                  onClick={() => setIsShuffled(!isShuffled)}
                  className="mono text-[10px] px-3 py-1 border border-[#333] hover:border-[#555] text-[#888] hover:text-white transition-colors"
                >
                  {isShuffled ? '⇄ SHUFFLED' : '⇄ SHUFFLE'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {visibleItems.map((nft) => (
                  <ConclaveGridCardSlot
                    key={nft.tokenId}
                    nft={nft}
                    onSelect={() => {
                      pauseAllIPFSLoads()
                      setSelectedTokenId(nft.tokenId)
                    }}
                  />
                ))}
              </div>
              {hasMore && <div ref={sentinelRef} className="h-1" />}
            </>
          ) : null}
        </motion.div>
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
              <div className="flex flex-col">
                <div className="relative aspect-square bg-[#0a0a0a]">
                  {selectedNFT.imageUrl && !heroOpen ? (
                    <SmartIPFSImage
                      key={selectedNFT.tokenId}
                      src={selectedNFT.imageUrl}
                      alt={selectedNFT.name}
                      className="w-full h-full object-contain"
                      priority
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
                    collection: 'CØNCLAVE',
                    imageUrl: selectedNFT.imageUrl ? resolveIpfsUrl(selectedNFT.imageUrl) || selectedNFT.imageUrl : undefined,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-2 py-1 text-center font-grotesk font-light bg-[#111] text-[#999] border border-[#222] hover:border-[#333] hover:text-white transition-colors mono text-[9px]"
                >
                  SHARE TO TWITTER
                </a>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-2">{selectedNFT.name}</h2>
                  <div className="mono text-xs text-[#666]">Token #{selectedNFT.tokenId}</div>
                </div>

                {selectedNFT.description && (
                  <div className="mono text-sm text-[#888] leading-relaxed whitespace-pre-line">
                    {selectedNFT.description}
                  </div>
                )}

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

                {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                  <div>
                    <div className="mono text-xs text-[#666] mb-3">ATTRIBUTES</div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNFT.attributes.map((attr: any, idx: number) => (
                        <div key={idx} className="mono text-xs text-[#888] border border-[#222] p-2">
                          <div className="text-[#666]">{attr.trait_type || attr.name}</div>
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
                    <div><span className="text-[#666]">TOKEN:</span> #{selectedNFT.tokenId}</div>
                    {selectedNFT.description && (
                      <div className="text-[#888] leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto"><span className="text-[#666]">DESCRIPTION:</span><br />{selectedNFT.description}</div>
                    )}
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
                          {selectedNFT.attributes.map((attr: any, idx: number) => (
                            <div key={idx} className="text-[#888] border border-[#222] p-2">
                              <div className="text-[#666] text-xs">{attr.trait_type || attr.name}</div>
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
