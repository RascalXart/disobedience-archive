import { notFound } from 'next/navigation'
import { getDropById, getAllDrops } from '@/lib/data'
import { getAllArtworks } from '@/lib/data'
import { ArtworkCard } from '@/components/ArtworkCard'
import Image from 'next/image'

// Required for static export with dynamic routes
export function generateStaticParams() {
  const drops = getAllDrops()
  return drops.map((drop) => ({
    dropId: drop.id,
  }))
}

interface DropPageProps {
  params: Promise<{ dropId: string }>
}

export default async function DropPage({ params }: DropPageProps) {
  const { dropId } = await params
  const drop = getDropById(dropId)
  const allArtworks = getAllArtworks()

  if (!drop) {
    notFound()
  }

  const dropArtworks = allArtworks.filter((artwork) =>
    drop.artworkIds.includes(artwork.id)
  )

  const startDate = new Date(drop.startDate)
  const endDate = new Date(drop.endDate)
  const isActive = new Date() >= startDate && new Date() <= endDate

  return (
    <main className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header Image */}
          <div className="relative aspect-video max-w-5xl mx-auto mb-12 overflow-hidden bg-[#111] border border-[#222]">
            <Image
              src={drop.imageUrl}
              alt={drop.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          </div>

          {/* Exhibition Info */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="mono text-xs text-[#666] mb-4 tracking-wider">
              [EXHIBITION_INFO]
            </div>
            <div className="flex items-start justify-between mb-6">
              <h1 className="font-grotesk text-5xl md:text-7xl font-light tracking-tighter">
                {drop.title}
              </h1>
              {isActive && (
                <span className="mono text-xs px-4 py-2 bg-[#4a4]/20 text-[#4a4] border border-[#4a4]/50">
                  ACTIVE
                </span>
              )}
            </div>

            <p className="mono text-sm text-[#888] mb-8 leading-relaxed">
              {drop.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mono text-xs border-t border-[#222] pt-6">
              <div>
                <div className="text-[#666] mb-1">START DATE</div>
                <div className="text-[#999]">
                  {startDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-[#666] mb-1">END DATE</div>
                <div className="text-[#999]">
                  {endDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-[#666] mb-1">WORKS</div>
                <div className="text-[#999]">{dropArtworks.length} PIECES</div>
              </div>
            </div>
          </div>

          {/* Featured Works */}
          <div>
            <div className="mono text-xs text-[#666] mb-6 tracking-wider">
              [FEATURED_WORKS]
            </div>
            {dropArtworks.length === 0 ? (
              <p className="mono text-sm text-[#666]">NO ARTWORKS IN THIS EXHIBITION</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {dropArtworks.map((artwork) => (
                  <ArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
