'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useMemo, useRef } from 'react'
import { getAllWinionsNFTs, getAllCollectionNFTs } from '@/lib/data'
import { LeaderboardGlitchEffects } from '@/components/LeaderboardGlitchEffects'
import { resolveENSCached } from '@/lib/ens-cache'
import type { CollectionNFT } from '@/types'

type Tab = 'winions' | 'conclave' | '1of1s'

const PAGE_SIZE = 20

// Treasury/sales wallets excluded from leaderboard
const EXCLUDED_ADDRESSES = new Set([
  '0xb4795da90b116ef1bd43217d3eadd7ab9a9f7ba7', // Winions sales wallet
])

interface HolderEntry {
  address: string
  count: number
}

function minifyAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getOpenSeaUrl(address: string, ensName?: string): string {
  if (ensName) {
    return `https://opensea.io/${ensName.replace('.eth', '')}`
  }
  return `https://opensea.io/${address}`
}

function aggregateHolders(nfts: CollectionNFT[]): HolderEntry[] {
  const counts = new Map<string, number>()
  for (const nft of nfts) {
    if (!nft.owner) continue
    const lower = nft.owner.toLowerCase()
    counts.set(lower, (counts.get(lower) || 0) + 1)
  }
  const addressMap = new Map<string, string>()
  for (const nft of nfts) {
    if (!nft.owner) continue
    const lower = nft.owner.toLowerCase()
    if (!addressMap.has(lower)) addressMap.set(lower, nft.owner)
  }
  return Array.from(counts.entries())
    .filter(([lower]) => !EXCLUDED_ADDRESSES.has(lower))
    .map(([lower, count]) => ({ address: addressMap.get(lower)!, count }))
    .sort((a, b) => b.count - a.count)
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('winions')
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const winionsNFTs = useMemo(() => getAllWinionsNFTs(), [])
  const conclaveNFTs = useMemo(() => getAllCollectionNFTs(), [])

  const allHolders = useMemo(() => {
    if (activeTab === 'winions') return aggregateHolders(winionsNFTs)
    if (activeTab === 'conclave') return aggregateHolders(conclaveNFTs)
    return []
  }, [activeTab, winionsNFTs, conclaveNFTs])

  const leaderboard = useMemo(
    () => allHolders.slice(0, visibleCount),
    [allHolders, visibleCount]
  )

  const hasMore = visibleCount < allHolders.length

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [activeTab])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, allHolders.length))
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, allHolders.length])

  useEffect(() => {
    const addresses = leaderboard.map(h => h.address)
    let cancelled = false
    async function resolve() {
      for (const addr of addresses) {
        if (cancelled) break
        if (ensNames[addr.toLowerCase()]) continue
        const name = await resolveENSCached(addr)
        if (name && !cancelled) {
          setEnsNames(prev => ({ ...prev, [addr.toLowerCase()]: name }))
        }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [leaderboard])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'winions', label: 'WINI\u00D8NS' },
    { key: 'conclave', label: 'C\u00D8NCLAVE' },
    { key: '1of1s', label: '1/1s' },
  ]

  const collectionTotal = activeTab === 'winions' ? winionsNFTs.length
    : activeTab === 'conclave' ? conclaveNFTs.length
    : 0

  return (
    <main className="page-root relative overflow-hidden">
      <LeaderboardGlitchEffects />

      {/* Scanlines */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          opacity: 0.5,
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-16 relative z-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-grotesk text-5xl md:text-7xl font-light tracking-tighter mb-3 lb-header">
              LEADERB\u00D8ARD
            </h1>
            {activeTab !== '1of1s' && (
              <div className="mono text-[10px] text-[#666] tracking-wider lb-subheader">
                [TOP_HOLDERS] &mdash; {collectionTotal} TOKENS TRACKED
              </div>
            )}
          </div>

          {/* Tab system */}
          <div className="flex gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`lb-tab mono text-[10px] px-4 py-2 border transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'border-[#555] text-white bg-[#111]'
                    : 'border-[#222] text-[#666] hover:border-[#333] hover:text-[#888]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Leaderboard table */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === '1of1s' ? (
              <div className="mono text-xs text-[#555] text-center py-16">
                [COMING_SOON]
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[40px_1fr_80px] md:grid-cols-[50px_1fr_100px] gap-2 px-3 py-2 border-b border-[#333] mb-1 lb-row">
                  <div className="mono text-[9px] text-[#555] tracking-wider">RANK</div>
                  <div className="mono text-[9px] text-[#555] tracking-wider">HOLDER</div>
                  <div className="mono text-[9px] text-[#555] tracking-wider text-right">HELD</div>
                </div>

                {/* Rows */}
                {leaderboard.map((holder, i) => {
                  const ens = ensNames[holder.address.toLowerCase()]
                  const displayName = ens || minifyAddress(holder.address)
                  const rank = i + 1
                  const isTop = rank === 1

                  return (
                    <motion.div
                      key={holder.address}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, PAGE_SIZE) * 0.03, duration: 0.3 }}
                      className={`lb-row grid grid-cols-[40px_1fr_80px] md:grid-cols-[50px_1fr_100px] gap-2 px-3 py-3 border-b border-[#1a1a1a] hover:bg-[#111] transition-colors group ${isTop ? 'bg-[#0f0f0f]' : ''}`}
                    >
                      <div className={`mono text-xs tabular-nums ${isTop ? 'text-[#c9a84c]' : 'text-[#555]'}`}>
                        {String(rank).padStart(2, '0')}
                      </div>

                      <div className="min-w-0">
                        <a
                          href={getOpenSeaUrl(holder.address, ens)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mono text-xs hover:text-white hover:underline underline-offset-2 cursor-pointer transition-colors truncate block ${
                            isTop ? 'text-[#c9a84c]' : 'text-[#999]'
                          }`}
                          title={holder.address}
                        >
                          {displayName}
                        </a>
                      </div>

                      <div className={`mono text-xs text-right tabular-nums ${isTop ? 'text-[#c9a84c]' : 'text-[#888]'}`}>
                        {holder.count}
                      </div>
                    </motion.div>
                  )
                })}

                {hasMore && (
                  <div ref={sentinelRef} className="py-6 text-center">
                    <div className="mono text-[10px] text-[#444]">
                      [LOADING_MORE...]
                    </div>
                  </div>
                )}

                {!hasMore && leaderboard.length > 0 && (
                  <div className="mono text-[10px] text-[#333] text-center py-6">
                    [{allHolders.length} HOLDERS TOTAL]
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </main>
  )
}
