'use client'

import Link from 'next/link'
import { getActiveDrops } from '@/lib/data'
import { getAllArtworks } from '@/lib/data'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function DropsPage() {
  const activeDrops = getActiveDrops()
  const allArtworks = getAllArtworks()

  return (
    <main className="page-root">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          <div className="mono text-xs text-[#666] mb-4 tracking-wider">
            [EXHIBITIONS]
          </div>
          <h1 className="font-grotesk text-5xl md:text-7xl font-light mb-4 tracking-tighter">
            DROPS
          </h1>
          <p className="mono text-sm text-[#888] mb-12">
            TIME-BOXED EXHIBITIONS & COLLECTIONS
          </p>

          {activeDrops.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="mono text-sm text-[#666]">NO ACTIVE EXHIBITIONS</p>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {activeDrops.map((drop, index) => {
                const dropArtworks = allArtworks.filter((artwork) =>
                  drop.artworkIds.includes(artwork.id)
                )
                const startDate = new Date(drop.startDate)
                const endDate = new Date(drop.endDate)
                const isActive = new Date() >= startDate && new Date() <= endDate

                return (
                  <motion.div
                    key={drop.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group cursor-pointer border border-[#222] hover:border-[#333] transition-colors"
                  >
                    <Link href={`/drops/${drop.id}`}>
                      <div className="relative aspect-video overflow-hidden bg-[#111]">
                        <Image
                          src={drop.imageUrl}
                          alt={drop.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                          sizes="(max-width: 768px) 100vw, 100vw"
                        />
                        <div className="absolute inset-0 bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/30 transition-colors" />
                        {isActive && (
                          <div className="absolute top-4 right-4">
                            <span className="mono text-xs px-3 py-1 bg-[#4a4]/20 text-[#4a4] border border-[#4a4]/50">
                              ACTIVE
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-6 md:p-8">
                        <h2 className="font-grotesk text-3xl md:text-4xl font-light mb-3 tracking-tighter group-hover:glitch">
                          {drop.title}
                        </h2>
                        <p className="mono text-sm text-[#888] mb-6">{drop.description}</p>
                        <div className="flex flex-wrap gap-6 mono text-xs text-[#666]">
                          <div>
                            <span className="text-[#444]">START:</span>{' '}
                            {startDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[#444]">END:</span>{' '}
                            {endDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }).toUpperCase()}
                          </div>
                          <div className="ml-auto">
                            {dropArtworks.length} {dropArtworks.length === 1 ? 'PIECE' : 'PIECES'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
