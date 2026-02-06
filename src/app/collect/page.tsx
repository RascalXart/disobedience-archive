'use client'

import { motion } from 'framer-motion'
import { getAllArtworks } from '@/lib/data'
import { ArtworkCard } from '@/components/ArtworkCard'

export default function CollectPage() {
  const availableArtworks = getAllArtworks().filter(
    (artwork) => artwork.status === 'available'
  )

  return (
    <main className="page-root">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          <div className="mono text-xs text-[#666] mb-4 tracking-wider">
            [COLLECTION_AVAILABLE]
          </div>
          <h1 className="font-grotesk text-5xl md:text-7xl font-light mb-4 tracking-tighter">
            COLLECT
          </h1>
          <p className="mono text-sm text-[#888] mb-12">
            {availableArtworks.length} {availableArtworks.length === 1 ? 'PIECE' : 'PIECES'} AVAILABLE FOR ACQUISITION
          </p>

          {availableArtworks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="mono text-sm text-[#666]">NO ARTWORKS CURRENTLY AVAILABLE</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {availableArtworks.map((artwork, index) => (
                <motion.div
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ArtworkCard artwork={artwork} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
