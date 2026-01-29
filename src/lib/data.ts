import artworksData from '@/data/artworks.json';
import dailiesData from '@/data/dailies.json';
import dropsData from '@/data/drops.json';
import type { Artwork, DailyArtwork, Drop } from '@/types';

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
  // Access env var - Next.js replaces NEXT_PUBLIC_* vars at build time
  const mediaBaseUrl = typeof window !== 'undefined' 
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_MEDIA_BASE_URL 
    : process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if URL contains /dailies/ (handles both /dailies/ and /disobedience-archive/dailies/)
  const dailiesMatch = url.match(/\/dailies\/([^/]+)$/);
  if (dailiesMatch) {
    const filename = dailiesMatch[1];
    
    // If NEXT_PUBLIC_MEDIA_BASE_URL is set, use it (both dev and production)
    if (mediaBaseUrl && mediaBaseUrl !== 'https://your-r2-url.r2.dev') {
      const baseUrl = mediaBaseUrl.replace(/\/$/, '');
      const resolvedUrl = `${baseUrl}/${filename}`;
      
      // Debug logging (only in development)
      if (!isProduction && typeof window !== 'undefined') {
        console.log(`[resolveDailyMediaUrl] Resolved ${url} -> ${resolvedUrl}`);
      }
      
      return resolvedUrl;
    }
    
    // Fallback: if no R2 URL is set, log warning and return broken URL so it's obvious
    if (typeof window !== 'undefined') {
      console.warn(
        `[resolveDailyMediaUrl] NEXT_PUBLIC_MEDIA_BASE_URL not set! ` +
        `Image will not load: ${filename}. ` +
        `Set NEXT_PUBLIC_MEDIA_BASE_URL in .env.local (dev) or Cloudflare Pages (production)`
      );
    }
    
    // Return a placeholder that will clearly fail
    return `#MISSING_R2_URL/${filename}`;
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

