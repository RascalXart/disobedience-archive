import artworksData from '@/data/artworks.json';
import dailiesData from '@/data/dailies.json';
import dropsData from '@/data/drops.json';
import type { Artwork, DailyArtwork, Drop, Collection, CollectionNFT } from '@/types';

// BasePath from next.config.mjs - needed for static assets
// This should match the basePath in next.config.mjs
// For Cloudflare Pages (root deployment), set NEXT_PUBLIC_BASE_PATH="" in build env
// For local dev and GitHub Pages, default to '/disobedience-archive'
const BASE_PATH = '/disobedience-archive';

/**
 * Resolves daily media URLs to external hosting.
 * In production builds, NEXT_PUBLIC_MEDIA_BASE_URL is required.
 * No fallback to local /public/dailies paths.
 */
export function resolveDailyMediaUrl(url: string): string {
  // Access env var - Next.js replaces NEXT_PUBLIC_* vars at build time for client bundle
  // In Next.js, NEXT_PUBLIC_* vars are embedded at build time, so process.env works in both server and client
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  
  // Check if URL contains /dailies/ (handles both /dailies/ and /disobedience-archive/dailies/)
  const dailiesMatch = url.match(/\/dailies\/([^/]+)$/);
  if (dailiesMatch) {
    const filename = dailiesMatch[1];
    
    // If NEXT_PUBLIC_MEDIA_BASE_URL is set and not a placeholder, use it
    if (mediaBaseUrl && !mediaBaseUrl.includes('your-r2-url')) {
      // Remove trailing slash from base URL if present
      const baseUrl = mediaBaseUrl.replace(/\/$/, '');
      // Construct the full URL
      // If baseUrl already includes /dailies, just append filename, otherwise append /dailies/filename
      const resolvedUrl = baseUrl.includes('/dailies')
        ? `${baseUrl}/${filename}`
        : `${baseUrl}/dailies/${filename}`;
      return resolvedUrl;
    }
    
    // Fallback: return normalized local path (will fail if files don't exist, but no console spam)
    return normalizeImageUrl(url);
  }
  
  // Not a dailies URL, return as-is
  return url;
}

/**
 * Normalizes image URLs to include the basePath prefix
 * This is necessary because Next.js basePath affects static asset paths
 */
export function normalizeImageUrl(url: string): string {
  // If URL already starts with basePath, return as-is
  if (url.startsWith(BASE_PATH)) {
    return url;
  }
  // If URL starts with /, prepend basePath
  if (url.startsWith('/')) {
    return `${BASE_PATH}${url}`;
  }
  // Otherwise, assume it's a relative path and prepend basePath with /
  return `${BASE_PATH}/${url}`;
}

export function getAllArtworks(): Artwork[] {
  return artworksData as Artwork[];
}

export function getArtworkById(id: string): Artwork | undefined {
  return artworksData.find((artwork) => artwork.id === id) as Artwork | undefined;
}

// Memoize the normalized dailies to avoid recreating on every call
let cachedDailies: DailyArtwork[] | null = null;

export function getAllDailies(): DailyArtwork[] {
  if (cachedDailies) {
    return cachedDailies;
  }
  
  cachedDailies = (dailiesData as DailyArtwork[]).map(daily => ({
    ...daily,
    imageUrl: resolveDailyMediaUrl(daily.imageUrl)
  })).sort((a, b) => 
    a.savedDate.localeCompare(b.savedDate)
  );
  
  return cachedDailies;
}

export function getDailyById(id: string): DailyArtwork | undefined {
  const daily = (dailiesData as DailyArtwork[]).find((daily) => daily.id === id);
  if (daily) {
    return {
      ...daily,
      imageUrl: resolveDailyMediaUrl(daily.imageUrl)
    };
  }
  return undefined;
}

export function getAllDrops(): Drop[] {
  return dropsData as Drop[];
}

export function getActiveDrops(): Drop[] {
  return dropsData.filter((drop) => drop.active) as Drop[];
}

export function getDropById(id: string): Drop | undefined {
  return dropsData.find((drop) => drop.id === id) as Drop | undefined;
}

// Collection data (NFTs from contract)
let collectionData: Collection | null = null;

export function getCollection(): Collection | null {
  if (collectionData) {
    return collectionData;
  }

  try {
    // Dynamic import to handle missing file gracefully
    const data = require('@/data/collection.json');
    collectionData = data as Collection;
    return collectionData;
  } catch (error) {
    // Collection data not found - that's okay
    return null;
  }
}

export function getAllCollectionNFTs(): CollectionNFT[] {
  const collection = getCollection();
  return collection?.tokens || [];
}

let cachedSpecialNFTs: CollectionNFT[] | null = null;

export function getSpecialCollectionNFTs(): CollectionNFT[] {
  if (cachedSpecialNFTs) return cachedSpecialNFTs;
  const collection = getCollection();
  if (!collection || !('specialTokens' in collection)) {
    return [];
  }
  const special = (collection as any).specialTokens;
  if (!special) return [];

  const tokens = collection.tokens || [];
  const specialTokenIds = [special.popeDoom, special.clippius].filter(Boolean);
  cachedSpecialNFTs = tokens.filter(t => specialTokenIds.includes(t.tokenId));
  return cachedSpecialNFTs;
}

let cachedRegularNFTs: CollectionNFT[] | null = null;

export function getRegularCollectionNFTs(): CollectionNFT[] {
  if (cachedRegularNFTs) return cachedRegularNFTs;
  const collection = getCollection();
  if (!collection) return [];

  const special = (collection as any).specialTokens;
  if (!special) {
    cachedRegularNFTs = collection.tokens || [];
    return cachedRegularNFTs;
  }

  const specialTokenIds = [special.popeDoom, special.clippius].filter(Boolean);
  cachedRegularNFTs = (collection.tokens || []).filter(t => !specialTokenIds.includes(t.tokenId));
  return cachedRegularNFTs;
}

export function getCollectionNFTByTokenId(tokenId: string): CollectionNFT | undefined {
  const collection = getCollection();
  return collection?.tokens.find((nft) => nft.tokenId === tokenId);
}

// WINIONS collection data
let winionsData: Collection | null = null;

export function getWinionsCollection(): Collection | null {
  if (winionsData) {
    return winionsData;
  }

  try {
    // Dynamic import to handle missing file gracefully
    const data = require('@/data/winions.json');
    winionsData = data as Collection;
    return winionsData;
  } catch (error) {
    // WINIONS data not found - that's okay
    return null;
  }
}

export function getAllWinionsNFTs(): CollectionNFT[] {
  const collection = getWinionsCollection();
  return collection?.tokens || [];
}
