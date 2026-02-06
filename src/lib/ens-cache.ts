/**
 * ENS resolution cache: in-memory + localStorage so we never hit the API
 * more than once per address (per session or per TTL).
 */

const CACHE_KEY = 'rascal-ens-cache'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

type CacheEntry = { name: string; ts: number }

let memory: Record<string, string> = {}

function loadFromStorage(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CacheEntry>
  } catch {
    return {}
  }
}

function saveToStorage(cache: Record<string, CacheEntry>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // quota or disabled
  }
}

function getCached(address: string): string | null {
  const lower = address.toLowerCase()
  if (memory[lower]) return memory[lower]
  const stored = loadFromStorage()
  const entry = stored[lower]
  if (!entry) return null
  if (Date.now() - entry.ts > TTL_MS) return null
  memory[lower] = entry.name
  return entry.name
}

function setCached(address: string, name: string) {
  const lower = address.toLowerCase()
  memory[lower] = name
  const stored = loadFromStorage()
  stored[lower] = { name, ts: Date.now() }
  saveToStorage(stored)
}

/**
 * Resolve ENS name for an address. Uses cache first (memory + localStorage).
 * Returns the ENS name or null. Caller can fall back to shortened address.
 */
export async function resolveENSCached(address: string): Promise<string | null> {
  if (!address) return null
  const cached = getCached(address)
  if (cached) return cached

  try {
    const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`)
    if (response.ok) {
      const data = await response.json()
      if (data?.name) {
        setCached(address, data.name)
        return data.name
      }
    }
  } catch {
    // try RPC fallback
  }

  try {
    const { ethers } = await import('ethers')
    const { DEFAULT_ETHEREUM_RPC_URL } = await import('@/lib/ethers-provider')
    const provider = new ethers.JsonRpcProvider(DEFAULT_ETHEREUM_RPC_URL)
    const name = await provider.lookupAddress(address)
    if (name) {
      setCached(address, name)
      return name
    }
  } catch {
    // ignore
  }

  return null
}
