import artworksData from '@/data/artworks.json';
import dailiesData from '@/data/dailies.json';
import dropsData from '@/data/drops.json';
import type { Artwork, DailyArtwork, Drop } from '@/types';

export function getAllArtworks(): Artwork[] {
  return artworksData as Artwork[];
}

export function getArtworkById(id: string): Artwork | undefined {
  return artworksData.find((artwork) => artwork.id === id) as Artwork | undefined;
}

export function getAllDailies(): DailyArtwork[] {
  return (dailiesData as DailyArtwork[]).sort((a, b) => 
    a.savedDate.localeCompare(b.savedDate)
  );
}

export function getDailyById(id: string): DailyArtwork | undefined {
  return (dailiesData as DailyArtwork[]).find((daily) => daily.id === id);
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

