/**
 * IPFS URL resolution with fallback gateways
 * Using multiple reliable public gateways
 */

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://ipfs.filebase.io/ipfs/',
]

/**
 * Resolves an IPFS URL, trying multiple gateways if one fails
 * Always uses our primary gateway (Pinata) even if URL already points to another gateway
 */
export function resolveIpfsUrl(ipfsUrl: string | null): string | null {
  if (!ipfsUrl) return null
  
  // Extract CID and path from any format
  let cid = ''
  let path = ''
  
  if (ipfsUrl.startsWith('ipfs://')) {
    const parts = ipfsUrl.replace('ipfs://', '').split('/')
    cid = parts[0]
    path = parts.slice(1).join('/')
  } else if (ipfsUrl.includes('/ipfs/')) {
    // Extract from any gateway URL (ipfs.io, pinata, etc.)
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
    // Not an IPFS URL, return as-is
    return ipfsUrl
  } else {
    // Just a CID
    cid = ipfsUrl
  }
  
  // Always use primary gateway (Pinata)
  const baseUrl = `${IPFS_GATEWAYS[0]}${cid}`
  return path ? `${baseUrl}/${path}` : baseUrl
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

