/**
 * Twitter share utility
 * Generates Twitter share URLs with randomized message variations
 */

const MESSAGE_VARIATIONS = [
  'rascal archival pull',
  'rascal archive extraction',
  'rascal archival discovery',
  'rascal archive pull',
  'rascal archival find',
]

interface ShareData {
  title: string
  date: string | Date
  ensName?: string | null | undefined
  url?: string
  tokenId?: string
  collection?: string
  imageUrl?: string
}

/**
 * Generate a Twitter share URL with a randomized message
 */
export function generateTwitterShareUrl(data: ShareData): string {
  // Pick a random message variation
  const messageTemplate = MESSAGE_VARIATIONS[Math.floor(Math.random() * MESSAGE_VARIATIONS.length)]
  
  // Format the date
  const dateStr = typeof data.date === 'string' 
    ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  
  // Build the tweet text
  let tweetText = `${messageTemplate.toUpperCase()}\n\n${data.title}`
  
  if (data.collection) {
    tweetText += `\n${data.collection}`
  }
  
  tweetText += `\n${dateStr}`
  
  if (data.ensName && data.ensName.trim()) {
    tweetText += `\n\nOwned by ${data.ensName}`
  }
  
  // For winions and conclave, use share page URL so Twitter can fetch Open Graph meta tags
  // This allows the GIF to appear in the tweet preview
  let url = data.url
  if (!url && data.tokenId && data.collection) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://rascalx.art')
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    
    if (data.collection === 'WINIØNS') {
      url = `${baseUrl}${basePath}/winions/share/${data.tokenId}`
    } else if (data.collection === 'CØNCLAVE') {
      url = `${baseUrl}${basePath}/conclave/share/${data.tokenId}`
    }
  }
  
  // Fallback to image URL or current page URL
  if (!url) {
    url = data.imageUrl || (typeof window !== 'undefined' ? window.location.href : '')
  }
  
  // Encode the tweet text
  const encodedText = encodeURIComponent(tweetText)
  const encodedUrl = encodeURIComponent(url)
  
  return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
}
