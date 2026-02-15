export type ArtworkStatus = "available" | "sold" | "not_listed" | "published";

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
  title?: string;
  description?: string;
  imageUrl: string;
  savedDate: string;
  status: ArtworkStatus;
  tags: string[];
  minted?: boolean;
  tokenId?: number;
  contractAddress?: string;
  owner?: string;
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

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface CollectionNFT {
  tokenId: string;
  tokenURI: string | null;
  owner: string | null;
  imageUrl: string | null;
  name: string;
  description: string | null;
  attributes: NFTAttribute[];
  externalUrl: string | null;
}

export interface Collection {
  contractAddress: string;
  chain: string;
  name: string;
  symbol: string;
  totalSupply: number;
  fetchedAt: string;
  description?: string; // Optional collection description
  tokens: CollectionNFT[];
}
