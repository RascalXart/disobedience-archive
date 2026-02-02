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
  
  // Use image URL if provided, otherwise fall back to page URL
  // Twitter will display the image when the image URL is used
  const url = data.imageUrl || data.url || (typeof window !== 'undefined' ? window.location.href : '')
  
  // Encode the tweet text
  const encodedText = encodeURIComponent(tweetText)
  const encodedUrl = encodeURIComponent(url)
  
  return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
}
