import artworksData from '@/data/artworks.json';
import dailiesData from '@/data/dailies.json';
import dropsData from '@/data/drops.json';
import type { Artwork, DailyArtwork, Drop } from '@/types';

// BasePath from next.config.mjs - needed for static assets
const BASE_PATH = '/disobedience-archive';

/**
 * Resolves daily media URLs to external hosting.
 * In production builds, NEXT_PUBLIC_MEDIA_BASE_URL is required.
 * No fallback to local /public/dailies paths.
 */
export function resolveDailyMediaUrl(url: string): string {
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if URL contains /dailies/ (handles both /dailies/ and /disobedience-archive/dailies/)
  const dailiesMatch = url.match(/\/dailies\/([^/]+)$/);
  if (dailiesMatch) {
    const filename = dailiesMatch[1];
    
    // In production, NEXT_PUBLIC_MEDIA_BASE_URL is required
    if (isProduction) {
      if (!mediaBaseUrl) {
        console.error(
          'NEXT_PUBLIC_MEDIA_BASE_URL is required in production builds. ' +
          'Please set this environment variable to your R2/CDN URL.'
        );
        // Return a placeholder URL to prevent build failure, but log the error
        return `#MISSING_MEDIA_BASE_URL/${filename}`;
      }
      // Remove trailing slash from base URL if present, then add filename
      const baseUrl = mediaBaseUrl.replace(/\/$/, '');
      return `${baseUrl}/${filename}`;
    }
    
    // In development, use external URL if available, otherwise fall back to local
    if (mediaBaseUrl) {
      const baseUrl = mediaBaseUrl.replace(/\/$/, '');
      return `${baseUrl}/${filename}`;
    }
    
    // Development fallback: return normalized local path
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

