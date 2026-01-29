'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'
import type { Artwork } from '@/types'
import { ArtworkModal } from './ArtworkModal'

interface ArtworkCardProps {
  artwork: Artwork
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ y: -2 }}
        className="group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors">
          <Image
            src={artwork.imageUrl}
            alt={artwork.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/20 transition-colors" />
          
          {/* Subtle status indicator */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0a0a0a]/90 to-transparent">
            <div className="flex items-center justify-between">
              <div className="mono text-xs text-[#666]">
                {new Date(artwork.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${
                artwork.status === 'available' ? 'bg-[#4a4]' :
                artwork.status === 'sold' ? 'bg-[#666]' :
                'bg-[#666]'
              }`} />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <h3 className="font-grotesk text-sm md:text-base font-light group-hover:glitch transition-all">
            {artwork.title}
          </h3>
        </div>
      </motion.div>

      {isModalOpen && (
        <ArtworkModal artwork={artwork} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}
