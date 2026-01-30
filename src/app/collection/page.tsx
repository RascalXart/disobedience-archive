'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getAllCollectionNFTs, getCollection, getSpecialCollectionNFTs, getRegularCollectionNFTs } from '@/lib/data'
import { resolveIpfsUrl, getFallbackIpfsUrl } from '@/lib/ipfs'
import Link from 'next/link'

// IPFS Image component with fallback gateways and timeout handling
function IpfsImage({ src, alt, className, loading }: { src: string; alt: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const [currentSrc, setCurrentSrc] = useState<string>(resolveIpfsUrl(src) || src)
  const [gatewayIndex, setGatewayIndex] = useState(0)
  const [hasError, setHasError] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleError = useMemo(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      const nextGatewayIndex = gatewayIndex + 1
      const fallback = getFallbackIpfsUrl(src, nextGatewayIndex)
      if (fallback) {
        // Only log if we're past the first fallback (gateway 2+)
        if (nextGatewayIndex >= 2) {
          console.log(`[IpfsImage] Gateway ${gatewayIndex + 1} failed, trying ${nextGatewayIndex + 1}`)
        }
        setCurrentSrc(fallback)
        setGatewayIndex(nextGatewayIndex)
      } else {
        console.error('[IpfsImage] All gateways failed for:', src)
        setHasError(true)
      }
    }
  }, [src, gatewayIndex])

  useEffect(() => {
    // Set a timeout for each gateway attempt (15 seconds)
    timeoutRef.current = setTimeout(() => {
      if (!hasError) {
        handleError()
      }
    }, 15000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentSrc, hasError, handleError])

  // Clear timeout when image loads successfully
  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="mono text-xs text-[#666]">NO IMAGE</span>
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}

export default function CollectionPage() {
  const collection = getCollection()
  const specialNFTs = getSpecialCollectionNFTs()
  const regularNFTs = getRegularCollectionNFTs()
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})
  
  // Combine for finding selected NFT
  const allNFTs = [...specialNFTs, ...regularNFTs]
  
  // Find Pope Doom (should be first in specialNFTs)
  const popeDoom = specialNFTs.find(nft => 
    nft.name && (nft.name.includes('Pope Doom') || nft.name.includes('Pøpe Døøm') || nft.name.includes('POPE DOOM'))
  )
  
  // Find Clippius (The Murdered Pope)
  const clippius = specialNFTs.find(nft => 
    nft.name && (nft.name.includes('Clippius') || nft.name.includes('CLIPPIUS') || nft.name.includes('Murdered Pope'))
  )
  
  const selectedNFT = useMemo(() => {
    if (!selectedTokenId) return null
    return allNFTs.find((nft) => nft.tokenId === selectedTokenId) || null
  }, [selectedTokenId, allNFTs])
  
  // Resolve ENS names for all tokens
  useEffect(() => {
    const resolveENS = async (address: string) => {
      if (!address) return
      
      // Check if already resolved
      if (ensNames[address]) return
      
      try {
        // Try public ENS API first
        const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`)
        if (response.ok) {
          const data = await response.json()
          if (data.name) {
            setEnsNames(prev => ({ ...prev, [address]: data.name }))
            return
          }
        }
      } catch (e) {
        // Fallback: try ethers.js if available
        try {
          const { ethers } = await import('ethers')
          const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com')
          const name = await provider.lookupAddress(address)
          if (name) {
            setEnsNames(prev => ({ ...prev, [address]: name }))
          }
        } catch (err) {
          // ENS resolution failed, will show truncated address
        }
      }
    }
    
    // Resolve ENS for Pope Doom and Clippius
    if (popeDoom?.owner) {
      resolveENS(popeDoom.owner)
    }
    if (clippius?.owner) {
      resolveENS(clippius.owner)
    }
  }, [popeDoom, specialNFTs])
  
  // Resolve ENS for selected NFT when modal opens
  useEffect(() => {
    if (!selectedNFT?.owner) return
    
    // Check if already resolved
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
  }, [selectedNFT?.owner, ensNames])

  if (!collection) {
    return (
      <main className="min-h-screen pt-24">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="mono text-xs text-[#666] mb-4 tracking-wider">
              [CONCLAVE_VIEW]
            </div>
            <h1 className="font-grotesk text-5xl md:text-7xl font-light mb-4 tracking-tighter">
              CONCLAVE
            </h1>
            <p className="mono text-sm text-[#888] mb-12">
              Collection data not found. Run: <code className="bg-[#111] px-2 py-1">node scripts/fetch-collection.js</code>
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mono text-xs text-[#666] mb-4 tracking-wider">
            [CONCLAVE_VIEW]
          </div>
          <motion.h1 
            className="font-grotesk text-5xl md:text-7xl font-light mb-4 tracking-tighter relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Multi-layer reflection effect with mirror offset */}
            <span className="absolute left-0 top-0 text-[#666]/10 blur-[3px] translate-y-[4px] scale-y-[-1] select-none pointer-events-none">
              CONCLAVE
            </span>
            <span className="absolute left-0 top-0 text-red-500/20 blur-[2px] -translate-x-[2px] select-none pointer-events-none">
              CONCLAVE
            </span>
            <span className="absolute left-0 top-0 text-green-500/20 blur-[2px] translate-x-[2px] select-none pointer-events-none">
              CONCLAVE
            </span>
            <span className="absolute left-0 top-0 text-blue-500/20 blur-[2px] translate-y-[1px] select-none pointer-events-none">
              CONCLAVE
            </span>
            <motion.span
              className="inline-block relative"
              animate={{
                textShadow: [
                  '0 0 10px rgba(255,255,255,0.1)',
                  '0 0 20px rgba(255,255,255,0.1)',
                  '0 0 10px rgba(255,255,255,0.1)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              CONCLAVE
            </motion.span>
          </motion.h1>
          
          {/* Project Description */}
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
          
          {/* Collection Description if available (from metadata) */}
          {collection.description && (
            <div className="mono text-sm text-[#888] mb-6 leading-relaxed max-w-3xl">
              {collection.description}
            </div>
          )}
          
          <div className="mono text-sm text-[#888] mb-12 space-y-2">
            <p>
              {collection.totalSupply} {collection.totalSupply === 1 ? 'TOKEN' : 'TOKENS'}
            </p>
            <p>
              Created: May 2025
            </p>
            <p className="text-[10px] text-[#555]">
              Contract: {collection.contractAddress}
            </p>
            <p className="text-[10px] text-[#555]">
              Chain: {collection.chain.toUpperCase()}
            </p>
          </div>

          {/* Pope Doom - Featured Section */}
          {popeDoom && (
            <div className="mb-16 border-b border-[#222] pb-16">
              <div className="mono text-xs text-[#666] mb-6 tracking-wider">
                [CURRENT_POPE]
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-[#111] border-2 border-[#444]">
                  {popeDoom.imageUrl ? (
                    <IpfsImage
                      src={popeDoom.imageUrl}
                      alt={popeDoom.name}
                      className="w-full h-full object-contain"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="mono text-xs text-[#666]">NO IMAGE</span>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="space-y-4">
                  <div className="mono text-[10px] text-[#666] mb-2 tracking-wider">
                    THE CURRENT POPE OF WEB3 DECIDED IN 2025 BY {collection.totalSupply} CARDINALS
                  </div>
                  <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-4">
                    {popeDoom.name}
                  </h2>
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

          {/* Clippius - Featured Section */}
          {clippius && (
            <div className="mb-16 border-b border-[#222] pb-16">
              <div className="mono text-xs text-[#666] mb-6 tracking-wider">
                [MURDERED_POPE]
              </div>
              <div className="grid md:grid-cols-3 gap-8 items-start">
                {/* Image - Smaller */}
                <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#333] max-w-xs">
                  {clippius.imageUrl ? (
                    <IpfsImage
                      src={clippius.imageUrl}
                      alt={clippius.name}
                      className="w-full h-full object-contain"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="mono text-xs text-[#666]">NO IMAGE</span>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="md:col-span-2 space-y-4">
                  <div className="mono text-[10px] text-[#666] mb-2 tracking-wider">
                    THE MURDERED POPE OF WEB3
                  </div>
                  <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-4">
                    {clippius.name}
                  </h2>
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

          {/* Regular NFT Grid */}
          {regularNFTs.length === 0 && specialNFTs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="mono text-sm text-[#666]">NO TOKENS FOUND</p>
            </motion.div>
          ) : regularNFTs.length > 0 ? (
            <>
              <div className="mono text-xs text-[#666] mb-6 tracking-wider border-b border-[#222] pb-2">
                [ALL_TOKENS]
              </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {regularNFTs.map((nft, index) => (
                <motion.div
                  key={nft.tokenId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedTokenId(nft.tokenId)}
                >
                  <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors">
                    {nft.imageUrl ? (
                      <IpfsImage
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="mono text-xs text-[#666]">NO IMAGE</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/20 transition-colors" />
                  </div>
                  <div className="mt-3">
                    <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors">
                      {nft.name}
                    </div>
                    <div className="mono text-[10px] text-[#555]">
                      Token #{nft.tokenId}
                    </div>
                  </div>
                </motion.div>
                ))}
              </div>
            </>
          ) : null}
        </motion.div>
      </div>

      {/* Modal for NFT details */}
      {selectedNFT && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/95 backdrop-blur-sm"
          onClick={() => setSelectedTokenId(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-4xl w-full bg-[#111] border border-[#222] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTokenId(null)}
              className="absolute top-4 right-4 mono text-xs text-[#666] hover:text-white transition-colors"
            >
              [CLOSE]
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Image */}
              <div className="relative aspect-square bg-[#0a0a0a]">
                {selectedNFT.imageUrl ? (
                  <IpfsImage
                    src={selectedNFT.imageUrl}
                    alt={selectedNFT.name}
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="mono text-xs text-[#666]">NO IMAGE</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-6">
                <div>
                  <h2 className="font-grotesk text-3xl font-light mb-2">
                    {selectedNFT.name}
                  </h2>
                  <p className="mono text-xs text-[#666] mb-3">
                    Token #{selectedNFT.tokenId}
                  </p>
                  
                  {/* Owner Info */}
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
                </div>

                {selectedNFT.description && (
                  <div>
                    <div className="mono text-[10px] text-[#666] mb-2">DESCRIPTION</div>
                    <p className="mono text-sm text-[#888] leading-relaxed whitespace-pre-line">
                      {selectedNFT.description}
                    </p>
                  </div>
                )}

                {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                  <div>
                    <div className="mono text-[10px] text-[#666] mb-3">ATTRIBUTES</div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNFT.attributes.map((attr, idx) => (
                        <div
                          key={idx}
                          className="border border-[#222] p-2 bg-[#0a0a0a]"
                        >
                          <div className="mono text-[10px] text-[#666] mb-1">
                            {attr.trait_type}
                          </div>
                          <div className="mono text-xs text-[#999]">
                            {attr.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {collection && (
                  <div className="pt-4 border-t border-[#222]">
                    <div className="mono text-[10px] text-[#666] mb-2">CONTRACT INFO</div>
                    <div className="mono text-xs text-[#888] space-y-1">
                      <p>Address: {collection.contractAddress}</p>
                      <p>Chain: {collection.chain.toUpperCase()}</p>
                      {selectedNFT.externalUrl && (
                        <Link
                          href={selectedNFT.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#666] hover:text-white transition-colors underline"
                        >
                          View on Explorer →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </main>
  )
}

