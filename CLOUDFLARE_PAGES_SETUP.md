# Cloudflare Pages Deployment Setup

## Required Environment Variables

For Cloudflare Pages root deployment, you **must** set these environment variables in your Cloudflare Pages project settings:

### 1. Set Base Path to Empty (Root Deployment)

**Variable:** `NEXT_PUBLIC_BASE_PATH`  
**Value:** (empty string - leave blank or set to `""`)

This tells Next.js to deploy to the root path instead of `/disobedience-archive`.

### 2. Set R2 Media Base URL

**Variable:** `NEXT_PUBLIC_MEDIA_BASE_URL`  
**Value:** `https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies`

This is your R2 bucket URL where all daily media files are hosted.

## How to Set Environment Variables in Cloudflare Pages

1. Go to your Cloudflare Pages project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the two variables above:
   - `NEXT_PUBLIC_BASE_PATH` = (empty/blank)
   - `NEXT_PUBLIC_MEDIA_BASE_URL` = `https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies`
4. Make sure they're set for **Production** environment
5. Save and trigger a new deployment

## Build Settings

- **Build command:** `npm run build`
- **Build output directory:** `out`
- **Node version:** 18 or higher

## After Setting Variables

After setting these variables, trigger a new deployment. The site should then:
- Load CSS and JavaScript correctly (assets at `/_next/...` instead of `/disobedience-archive/_next/...`)
- Load images from R2 bucket
- Display properly styled

## Troubleshooting

If styles/images still don't load:
1. Check browser console for 404 errors
2. Verify environment variables are set correctly (no typos)
3. Clear Cloudflare cache if needed
4. Check that the build completed successfully

