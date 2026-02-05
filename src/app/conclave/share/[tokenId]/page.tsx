import { notFound } from 'next/navigation'
import { getAllCollectionNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'
import type { Metadata } from 'next'
import Image from 'next/image'

// Generate static params for all conclave NFTs
export function generateStaticParams() {
  const nfts = getAllCollectionNFTs()
  return nfts.map((nft) => ({
    tokenId: nft.tokenId,
  }))
}

interface ConclaveSharePageProps {
  params: Promise<{ tokenId: string }>
}

export async function generateMetadata({ params }: ConclaveSharePageProps): Promise<Metadata> {
  const { tokenId } = await params
  const nfts = getAllCollectionNFTs()
  const nft = nfts.find((n) => n.tokenId === tokenId)

  if (!nft) {
    return {
      title: 'NFT Not Found',
    }
  }

  const imageUrl = nft.imageUrl ? resolveIpfsUrl(nft.imageUrl) || nft.imageUrl : undefined
  // Use environment variable or default for site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rascalx.art'

  return {
    title: `${nft.name} | CØNCLAVE`,
    description: nft.description || `${nft.name} from the CØNCLAVE collection`,
    openGraph: {
      title: nft.name,
      description: nft.description || `${nft.name} from the CØNCLAVE collection`,
      type: 'website',
      url: `${siteUrl}/conclave/share/${tokenId}`,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 1200,
              alt: nft.name,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: nft.name,
      description: nft.description || `${nft.name} from the CØNCLAVE collection`,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function ConclaveSharePage({ params }: ConclaveSharePageProps) {
  const { tokenId } = await params
  const nfts = getAllCollectionNFTs()
  const nft = nfts.find((n) => n.tokenId === tokenId)

  if (!nft) {
    notFound()
  }

  const imageUrl = nft.imageUrl ? resolveIpfsUrl(nft.imageUrl) || nft.imageUrl : undefined

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="font-grotesk text-3xl md:text-4xl font-light mb-6">{nft.name}</h1>
        {imageUrl && (
          <div className="relative aspect-square max-w-lg mx-auto mb-6">
            <Image
              src={imageUrl}
              alt={nft.name}
              fill
              className="object-contain"
              unoptimized
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        )}
        <p className="mono text-sm text-[#888] mb-4">CØNCLAVE Collection</p>
        <a
          href="/conclave"
          className="mono text-xs px-4 py-2 border border-[#222] hover:border-[#333] transition-colors inline-block"
        >
          VIEW COLLECTION
        </a>
      </div>
    </main>
  )
}
