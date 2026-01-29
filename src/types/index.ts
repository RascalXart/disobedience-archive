export type ArtworkStatus = "available" | "sold" | "not_listed";

export interface Artwork {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  minted: boolean;
  tokenId: string | null;
  transientLabsUrl: string | null;
  priceStrategyKey: string | null;
  status: ArtworkStatus;
  tags: string[];
}

export interface DailyArtwork {
  id: string;
  imageUrl: string;
  savedDate: string;
  status: ArtworkStatus;
  tags: string[];
}

export interface Drop {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  artworkIds: string[];
  imageUrl: string;
}

export type FilterStatus = "all" | "available" | "sold";

