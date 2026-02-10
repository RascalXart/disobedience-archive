import { notFound } from 'next/navigation'
import { getAllWinionsNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'
import type { Metadata } from 'next'
import Image from 'next/image'

// Generate static params for all winions
export function generateStaticParams() {
  const nfts = getAllWinionsNFTs()
  return nfts.map((nft) => ({
    tokenId: nft.tokenId,
  }))
}

interface WinionSharePageProps {
  params: Promise<{ tokenId: string }>
}

export async function generateMetadata({ params }: WinionSharePageProps): Promise<Metadata> {
  const { tokenId } = await params
  const nfts = getAllWinionsNFTs()
  const nft = nfts.find((n) => n.tokenId === tokenId)

  if (!nft) {
    return {
      title: 'Winiøn Not Found',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rascalx.xyz'

  // Use static JPG preview for OG image — Twitter can't handle large IPFS GIFs (>5MB)
  const ogImageUrl = `${siteUrl.replace(/\/+$/, '')}/og/winions/${tokenId}.jpg`

  // Use tokenId to construct display name so it matches the URL
  const displayName = `Winiøn #${tokenId}`

  return {
    title: `${displayName} | WINIØNS`,
    description: nft.description || `${displayName} from the WINIØNS collection`,
    openGraph: {
      title: displayName,
      description: nft.description || `${displayName} from the WINIØNS collection`,
      type: 'website',
      url: `${siteUrl.replace(/\/+$/, '')}/winions/share/${tokenId}`,
      images: [{ url: ogImageUrl, width: 600, height: 600, alt: displayName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: displayName,
      description: nft.description || `${displayName} from the WINIØNS collection`,
      images: [ogImageUrl],
    },
  }
}

export default async function WinionSharePage({ params }: WinionSharePageProps) {
  const { tokenId } = await params
  const nfts = getAllWinionsNFTs()
  const nft = nfts.find((n) => n.tokenId === tokenId)

  if (!nft) {
    notFound()
  }

  const imageUrl = nft.imageUrl ? resolveIpfsUrl(nft.imageUrl) || nft.imageUrl : undefined
  
  // Use tokenId to construct display name so it matches the URL
  const displayName = `Winiøn #${tokenId}`

  return (
    <main className="page-root text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="font-grotesk text-3xl md:text-4xl font-light mb-6">{displayName}</h1>
        {imageUrl && (
          <div className="relative aspect-square max-w-lg mx-auto mb-6">
            <Image
              src={imageUrl}
              alt={displayName}
              fill
              className="object-contain"
              unoptimized
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        )}
        <p className="mono text-sm text-[#888] mb-4">WINIØNS Collection</p>
        <a
          href="/winions"
          className="mono text-xs px-4 py-2 border border-[#222] hover:border-[#333] transition-colors inline-block"
        >
          VIEW COLLECTION
        </a>
      </div>
    </main>
  )
}
