# Diagnostic Prompt for WINIONS Page Image Loading Issues

## Problem Description

I have a Next.js React application displaying 664 NFT images (WINIONS) on a single page. The page uses pagination (50 images initially, then "LOAD MORE" to show 50 more). Each image is loaded via IPFS gateways using a custom `StaticWinionImage` component.

**The Issue:**
- After loading a certain number of WINIONS (around 50-100), the page starts "pumping out errors" continuously
- Images stop loading properly
- Console errors appear repeatedly and never stop
- The page becomes unresponsive or very slow
- This happens even though there's pagination limiting visible images

## Current Implementation Details

### Image Loading Component (`StaticWinionImage`)
- Uses Intersection Observer for lazy loading (only loads images in/near viewport with 50px margin)
- Implements infinite retry logic: if an image fails, it cycles through:
  1. Multiple IPFS gateways (4 total: ipfs.filebase.io, cf-ipfs.com, ipfs.io, gateway.pinata.cloud)
  2. Multiple path variations (up to 4 variations per image)
  3. If all combinations fail, waits 2 seconds and restarts from the first gateway/path
- Each retry attempt has a 6-second timeout
- Uses `setTimeout` for retry delays (300ms, 500ms, 800ms, 2000ms)
- No rate limiting or backoff strategy
- `handleError` callback has dependencies: `[pathIndex, pathVariations.length, gatewayIndex, mounted, shouldLoad, extractIpfsHash, currentSrc, pathVariations]`

### Potential Issues I've Identified

1. **Memory Leak from Timeouts**: Each failing image creates multiple `setTimeout` calls that accumulate. With 50+ visible images, if many fail, this could create hundreds/thousands of pending timeouts.

2. **Stale Closures**: The `handleError` callback depends on `currentSrc` and `pathVariations`, which change frequently. This could cause the callback to be recreated often, leading to multiple concurrent retry attempts for the same image.

3. **Browser Connection Limits**: Browsers limit concurrent connections per domain (typically 6-10). With 4 different IPFS gateways and 50+ images trying to load simultaneously, this could overwhelm the connection pool.

4. **No Request Deduplication**: If an image fails and retries, there's no mechanism to prevent multiple components from retrying the same failed URL simultaneously.

5. **Intersection Observer Churn**: When the page shuffles or filters, many intersection observers are created/destroyed rapidly, which could cause performance issues.

6. **Infinite Retry Loop**: The "never give up" retry logic means failed images keep retrying forever, even if the gateway is down or the image doesn't exist. This could flood the console with errors.

## What I Need

Please analyze the code and provide:

1. **Root Cause Analysis**: What is the primary reason the page breaks after loading a certain number of images?

2. **Specific Fixes**: Provide concrete code changes to:
   - Prevent memory leaks from accumulating timeouts
   - Add proper cleanup for failed image attempts
   - Implement rate limiting/backoff for retries
   - Deduplicate concurrent requests for the same image
   - Add a maximum retry limit or exponential backoff
   - Fix any stale closure issues in the error handling

3. **Performance Optimizations**: Suggestions to:
   - Reduce the number of concurrent image loads
   - Better manage Intersection Observer lifecycle
   - Optimize the retry strategy to be less aggressive

4. **Code Changes**: Provide the updated `StaticWinionImage` component with all fixes applied, ready to be integrated into the codebase.

## Code Context

The component is in `src/app/winions/page.tsx`, starting at line 54. The page displays filtered NFTs in a grid, with pagination showing 50 at a time. The `StaticWinionImage` component is used for each NFT thumbnail.

Key requirements:
- Must continue retrying failed images (user wants images to eventually load, not show "NO IMAGE")
- Must use lazy loading (only load images in/near viewport)
- Must work with IPFS gateways that may have SSL errors or rate limits
- Must be performant even with 664 total NFTs

Please provide a comprehensive solution that addresses the root cause and prevents the error flooding issue.
