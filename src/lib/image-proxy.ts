/**
 * Image proxy utility for Twitter/Open Graph
 * Proxies IPFS images through a service that Twitter can reliably access
 */

/**
 * Proxies an IPFS image URL through a service that Twitter can access
 * Uses images.weserv.nl as a free, reliable proxy service
 */
export function proxyImageForTwitter(imageUrl: string | null | undefined): string | null | undefined {
  if (!imageUrl) return imageUrl
  
  // If it's already a non-IPFS URL, return as-is
  if (!imageUrl.includes('ipfs')) {
    return imageUrl
  }
  
  // Use images.weserv.nl as a free image proxy
  // This service proxies images and makes them accessible to Twitter's crawler
  // Format: https://images.weserv.nl/?url=<encoded-image-url>
  const encodedUrl = encodeURIComponent(imageUrl)
  return `https://images.weserv.nl/?url=${encodedUrl}`
}
