# Rascal Art Website

An anonymous crypto-art portfolio and storefront for the artist "Rascal". This site serves as an archive of hundreds of daily artworks ("Rascal Dailies") that are available for purchase as NFTs on Transient Labs.

## Features

- **Gallery View**: Browse all artworks with filters for status (available/sold/all), tags, and date range
- **Shop View**: View only available artworks for purchase
- **Drops Section**: Time-boxed exhibition/collection pages that can be toggled on/off
- **Artwork Detail Modal**: Full-screen modal with artwork details and Transient Labs purchase/view links
- **Mobile-First Design**: Fully responsive and accessible
- **Mysterious Aesthetic**: Dark, experimental museum-like feel

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**
- **Local JSON Database** (for artworks and drops)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Structure

### Artworks (`data/artworks.json`)

Each artwork contains:
- `id`: Unique identifier
- `title`: Artwork title
- `date`: Creation date (YYYY-MM-DD)
- `imageUrl`: URL to artwork image
- `minted`: Boolean indicating if NFT is minted
- `tokenId`: Token ID if minted (null otherwise)
- `transientLabsUrl`: Link to view/purchase on Transient Labs
- `priceStrategyKey`: Pricing strategy (e.g., "ladder_6_9")
- `status`: "available" | "sold" | "not_listed"
- `tags`: Array of tag strings

### Drops (`data/drops.json`)

Each drop contains:
- `id`: Unique identifier
- `title`: Drop title
- `description`: Drop description
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `active`: Boolean to enable/disable the drop
- `artworkIds`: Array of artwork IDs included in the drop
- `imageUrl`: URL to drop banner image

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── gallery/           # Gallery page with filters
│   ├── shop/              # Shop page (available items only)
│   ├── drops/             # Drops listing and detail pages
│   └── page.tsx           # Home page
├── components/             # React components
│   ├── ArtworkCard.tsx    # Artwork card component
│   ├── ArtworkModal.tsx   # Artwork detail modal
│   └── GalleryFilters.tsx # Filter component
├── lib/                    # Utility functions
│   └── data.ts            # Data access functions
└── types/                  # TypeScript types
    └── index.ts           # Type definitions
```

## Building for Production

```bash
npm run build
npm start
```

## Notes

- The site works without wallet connection (MVP)
- Artworks link to Transient Labs for purchase/viewing
- Drops can be activated/deactivated by setting `active: true/false` in `data/drops.json`
- All images use Next.js Image component for optimization

