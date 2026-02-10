/**
 * Image proxy utility for Twitter/Open Graph.
 * Rewrites raw IPFS gateway URLs to the Cloudflare Worker proxy,
 * which has edge caching and fast response times for Twitter's crawler.
 */

const PROXY_BASE = (process.env.NEXT_PUBLIC_IPFS_PROXY || 'https://ipfs-proxy.lascaux42693169.workers.dev').replace(/\/$/, '')

export function proxyImageForTwitter(imageUrl: string | null | undefined): string | null | undefined {
  if (!imageUrl) return imageUrl

  // Already using the proxy
  if (imageUrl.includes('ipfs-proxy.lascaux42693169.workers.dev')) return imageUrl

  // Rewrite raw IPFS gateway URLs to go through the proxy
  const ipfsMatch = imageUrl.match(/https?:\/\/[^/]+\/ipfs\/(.+)/)
  if (ipfsMatch) {
    return `${PROXY_BASE}/ipfs/${ipfsMatch[1]}`
  }

  return imageUrl
}
