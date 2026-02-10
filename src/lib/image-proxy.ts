/**
 * Image proxy utility for Twitter/Open Graph.
 * Returns the image URL directly — the IPFS proxy (Cloudflare Worker) and R2 CDN
 * are both fast and publicly accessible, so no third-party proxy is needed.
 */
export function proxyImageForTwitter(imageUrl: string | null | undefined): string | null | undefined {
  return imageUrl
}
