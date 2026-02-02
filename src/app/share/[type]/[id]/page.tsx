import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllDailies, resolveDailyMediaUrl } from '@/lib/data'
import { getAllArtworks } from '@/lib/data'
import { getAllCollectionNFTs, getAllWinionsNFTs } from '@/lib/data'
import { resolveIpfsUrl } from '@/lib/ipfs'

// Generate static params for all shareable items
export function generateStaticParams() {
  const params: Array<{ type: string; id: string }> = []
  
  // Daily artworks
  const dailies = getAllDailies()
  dailies.forEach(daily => {
    params.push({ type: 'daily', id: daily.id })
  })
  
  // Regular artworks
  const artworks = getAllArtworks()
  artworks.forEach(artwork => {
    params.push({ type: 'artwork', id: artwork.id })
  })
  
  // Conclave NFTs
  const conclaveNFTs = getAllCollectionNFTs()
  conclaveNFTs.forEach(nft => {
    params.push({ type: 'conclave', id: nft.tokenId })
  })
  
  // WINIONS NFTs
  const winionsNFTs = getAllWinionsNFTs()
  winionsNFTs.forEach(nft => {
    params.push({ type: 'winion', id: nft.tokenId })
  })
  
  return params
}

interface SharePageProps {
  params: Promise<{ type: string; id: string }>
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { type, id } = await params
  let imageUrl = ''
  let title = ''
  let description = ''
  
  if (type === 'daily') {
    const dailies = getAllDailies()
    const daily = dailies.find(d => d.id === id)
    if (daily) {
      imageUrl = resolveDailyMediaUrl(daily.imageUrl)
      title = daily.id.replace(/_/g, ' ').toUpperCase()
      description = `Rascal Daily Artwork - ${title}`
    }
  } else if (type === 'artwork') {
    const artworks = getAllArtworks()
    const artwork = artworks.find(a => a.id === id)
    if (artwork) {
      imageUrl = artwork.imageUrl
      title = artwork.title
      description = `Rascal Artwork - ${title}`
    }
  } else if (type === 'conclave') {
    const nfts = getAllCollectionNFTs()
    const nft = nfts.find(n => n.tokenId === id)
    if (nft && nft.imageUrl) {
      imageUrl = resolveIpfsUrl(nft.imageUrl) || nft.imageUrl
      title = nft.name
      description = `CØNCLAVE NFT - ${title}`
    }
  } else if (type === 'winion') {
    const nfts = getAllWinionsNFTs()
    const nft = nfts.find(n => n.tokenId === id)
    if (nft && nft.imageUrl) {
      imageUrl = resolveIpfsUrl(nft.imageUrl) || nft.imageUrl
      title = nft.name
      description = `WINIØNS NFT - ${title}`
    }
  }
  
  if (!imageUrl) {
    return {
      title: 'Not Found',
    }
  }
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default function SharePage() {
  // This page exists only for Twitter to crawl the meta tags
  // The metadata is generated via generateMetadata above
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff', background: '#0a0a0a' }}>
      <p>Loading artwork...</p>
    </div>
  )
}
