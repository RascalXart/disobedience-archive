'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Artwork } from '@/types'

interface ArtworkCardProps {
  artwork: Artwork
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  return (
    <Link href={`/gallery/${artwork.id}`} className="block group">
      <div className="relative aspect-square overflow-hidden bg-[#111] border border-[#222] group-hover:border-[#333] transition-colors">
        <Image
          src={artwork.imageUrl}
          alt={artwork.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
      </div>
      <div className="mt-3">
        <div className="mono text-xs text-[#666] group-hover:text-[#888] transition-colors">
          {artwork.title.toUpperCase()}
        </div>
        <div className="mono text-[10px] text-[#555] mt-1">
          {artwork.status.toUpperCase().replace('_', ' ')}
        </div>
      </div>
    </Link>
  )
}
