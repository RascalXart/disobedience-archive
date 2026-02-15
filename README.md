# Rascal Art Website (`rascalx.xyz`)

Dark glitch-aesthetic NFT portfolio built with Next.js App Router and deployed as a static export on Cloudflare Pages.

## Core Architecture

- Frontend: Next.js 14 + TypeScript + Tailwind + Framer Motion
- Deployment: Cloudflare Pages (`next build` static export)
- NFT media: IPFS, routed through Cloudflare Worker proxy
- Daily media: Cloudflare R2 (`NEXT_PUBLIC_MEDIA_BASE_URL`)
- Data source: local JSON in `src/data/`

## Main Collections

- `WINIØNS` (`src/data/winions.json`)
- `CØNCLAVE` (`src/data/collection.json`)
- `Rascal Everydays` (`src/data/dailies.json`)

## Image Loading Strategy

- `src/components/SmartIPFSImage.tsx`
  - progressive loading (skeleton -> thumb -> full)
  - priority mode for modal/fullscreen images
  - global pause/resume support for background grid loads
  - grid concurrency caps to prevent bandwidth collapse

- `ipfs-proxy-worker/src/index.ts`
  - multi-gateway race (`ipfs.io`, `dweb.link`)
  - Cloudflare edge caching
  - `/daily/...` proxy route for R2 filename control

## Admin (Dailies)

- UI: `/admin` (`src/app/admin/page.tsx`)
- API: `src/app/api/admin/dailies/route.ts`
- Auth:
  - set `ADMIN_API_KEY` to require auth for GET/PUT
  - client sends key via `x-admin-key` header
  - in production, API requires `ADMIN_API_KEY`
- Notes:
  - static exports do not provide a long-running Next.js API runtime
  - use local/dev runtime for JSON editing workflows

## Environment Variables

- `NEXT_PUBLIC_SITE_URL` (e.g. `https://rascalx.xyz`)
- `NEXT_PUBLIC_IPFS_PROXY` (Worker URL)
- `NEXT_PUBLIC_MEDIA_BASE_URL` (R2 base URL)
- `NEXT_PUBLIC_BASE_PATH` (optional; root deploy usually empty)
- `ADMIN_API_KEY` (optional in dev, required in prod API runtime)

## Local Development

```bash
npm install
npm run dev
```

App runs on [http://localhost:3001](http://localhost:3001).

## Data Quality + Build

```bash
npm run validate-data
npm run build
```

`npm run build` now validates JSON data before building.

## Utility Scripts

- `warm-cache.js` - warms IPFS worker cache
- `generate-thumbnails.js` - NFT thumbs
- `generate-daily-thumbnails.js` - dailies thumbs
- `generate-og-images.js` - static OG images for share pages
