/**
 * IPFS URL resolution.
 * When NEXT_PUBLIC_IPFS_PROXY is set, all IPFS URLs go through the Cloudflare Worker proxy (edge cache + gateway fallback).
 * Otherwise uses a single public gateway.
 */

const IPFS_PROXY_BASE = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_IPFS_PROXY ?? '').replace(/\/$/, '') : ''

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
]

/**
 * Resolves an IPFS URI to a single URL.
 * If NEXT_PUBLIC_IPFS_PROXY is set, returns the proxy URL (worker handles caching and gateway retries).
 * Otherwise returns the first gateway URL.
 */
export function resolveIpfsUrl(ipfsUrl: string | null): string | null {
  if (!ipfsUrl) return null

  let cid = ''
  let path = ''

  if (ipfsUrl.startsWith('ipfs://')) {
    const parts = ipfsUrl.replace('ipfs://', '').split('/')
    cid = parts[0]
    path = parts.slice(1).join('/')
  } else if (ipfsUrl.includes('/ipfs/')) {
    const match = ipfsUrl.match(/\/ipfs\/([^?]+)/)
    if (match) {
      const fullPath = match[1]
      const parts = fullPath.split('/')
      cid = parts[0]
      path = parts.slice(1).join('/')
    } else {
      return ipfsUrl
    }
  } else if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl
  } else {
    cid = ipfsUrl
  }

  if (IPFS_PROXY_BASE) {
    const cidAndPath = path ? `${cid}/${path}` : cid
    return `${IPFS_PROXY_BASE}/ipfs/${cidAndPath}`
  }

  const baseUrl = `${IPFS_GATEWAYS[0]}${cid}`
  return path ? `${baseUrl}/${path}` : baseUrl
}

/** Extract CID/path from IPFS URI (same as resolveIpfsUrl). */
function parseIpfsUri(ipfsUrl: string | null): { cid: string; path: string } | null {
  if (!ipfsUrl) return null
  let cid = ''
  let path = ''
  if (ipfsUrl.startsWith('ipfs://')) {
    const parts = ipfsUrl.replace('ipfs://', '').split('/')
    cid = parts[0]
    path = parts.slice(1).join('/')
  } else if (ipfsUrl.includes('/ipfs/')) {
    const match = ipfsUrl.match(/\/ipfs\/([^?]+)/)
    if (!match) return null
    const parts = match[1].split('/')
    cid = parts[0]
    path = parts.slice(1).join('/')
  } else if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return null
  } else {
    cid = ipfsUrl
  }
  return { cid, path }
}

/**
 * Direct gateway URL for an IPFS src (ipfs.io). Use as fallback when proxy fails.
 * Returns null for non-IPFS (e.g. R2, already http).
 */
export function getDirectGatewayUrl(ipfsUrl: string | null): string | null {
  const parsed = parseIpfsUri(ipfsUrl)
  if (!parsed) return null
  const { cid, path } = parsed
  const base = `${IPFS_GATEWAYS[0]}${cid}`
  return path ? `${base}/${path}` : base
}

/**
 * Gets a fallback IPFS URL if the primary one fails
 */
export function getFallbackIpfsUrl(ipfsUrl: string | null, gatewayIndex: number = 1): string | null {
  if (!ipfsUrl) return null
  
  // Extract CID and path from various formats
  let cid = ''
  let path = ''
  
  if (ipfsUrl.startsWith('ipfs://')) {
    const parts = ipfsUrl.replace('ipfs://', '').split('/')
    cid = parts[0]
    path = parts.slice(1).join('/')
  } else if (ipfsUrl.includes('/ipfs/')) {
    const match = ipfsUrl.match(/\/ipfs\/([^?]+)/)
    if (match) {
      const fullPath = match[1]
      const parts = fullPath.split('/')
      cid = parts[0]
      path = parts.slice(1).join('/')
    } else {
      return null
    }
  } else if (ipfsUrl.startsWith('http')) {
    // Already a full URL, try to extract CID and path
    const match = ipfsUrl.match(/\/ipfs\/([^?]+)/)
    if (match) {
      const fullPath = match[1]
      const parts = fullPath.split('/')
      cid = parts[0]
      path = parts.slice(1).join('/')
    } else {
      return null
    }
  } else {
    cid = ipfsUrl
  }
  
  if (gatewayIndex >= IPFS_GATEWAYS.length) {
    return null
  }
  
  // Reconstruct URL with path if it exists
  const baseUrl = `${IPFS_GATEWAYS[gatewayIndex]}${cid}`
  return path ? `${baseUrl}/${path}` : baseUrl
}

