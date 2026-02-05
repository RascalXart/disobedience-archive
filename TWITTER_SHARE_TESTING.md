# Testing Twitter Share Functionality

## Quick Test Steps

### 1. Build and Deploy the Site

First, make sure the share pages are built:

```bash
npm run build
```

This will generate all the share pages at:
- `/winions/share/[tokenId]`
- `/conclave/share/[tokenId]`

### 2. Get a Share Page URL

After deployment, get a share page URL. For example:
- `https://yourdomain.com/winions/share/1`
- `https://yourdomain.com/conclave/share/1`

Or if testing locally:
- `http://localhost:3001/winions/share/1`

### 3. Test with Twitter Card Validator

1. Go to: **https://cards-dev.twitter.com/validator**
2. Enter your share page URL (e.g., `https://yourdomain.com/winions/share/1`)
3. Click "Preview card"
4. Check if:
   - The image preview appears
   - The title and description are correct
   - The card type is "summary_large_image"

**What to look for:**
- ✅ **Success**: Image preview shows the GIF
- ❌ **Failure**: No image preview, or error message about image not being accessible

### 4. Check Meta Tags Directly

You can also inspect the meta tags in the HTML:

**Option A: Browser DevTools**
1. Open the share page in your browser
2. Right-click → "View Page Source"
3. Look for `<meta property="og:image"` tags
4. Verify the image URL is correct

**Option B: Command Line**
```bash
curl -s https://yourdomain.com/winions/share/1 | grep -i "og:image"
```

**Option C: Online Tools**
- https://www.opengraph.xyz/ - Paste your share page URL
- https://metatags.io/ - Another meta tag checker

### 5. Test Actual Twitter Share

1. Go to your winions or conclave page
2. Click on any NFT to open the modal
3. Click "SHARE TO TWITTER"
4. In the Twitter compose window, check if:
   - The image preview appears below the tweet
   - The link preview shows the correct image

**Note**: Twitter may cache old previews. If you've updated the meta tags:
- Use Twitter's Card Validator to clear the cache
- Or wait a few minutes for Twitter's cache to expire

## Troubleshooting

### If the image doesn't appear in Twitter:

**Problem**: Twitter can't fetch the IPFS image URL

**Solutions**:
1. **Check if IPFS gateway is accessible**
   - Try opening the IPFS URL directly in a browser
   - If it doesn't load, Twitter won't be able to fetch it either

2. **Use a more reliable IPFS gateway**
   - Update `resolveIpfsUrl` to use `ipfs.io` (most reliable for Twitter)
   - Or use a dedicated Pinata gateway

3. **Set up a proxy** (if above doesn't work)
   - Use Cloudflare Workers to proxy IPFS content
   - Or use a service like Cloudinary's image proxy

### If meta tags are missing:

**Problem**: Share pages aren't generating metadata correctly

**Check**:
1. Verify `generateMetadata` function is exported
2. Check that `generateStaticParams` includes all tokenIds
3. Ensure the build completed successfully

## Expected Results

✅ **Working correctly:**
- Twitter Card Validator shows image preview
- Meta tags include correct `og:image` URL
- Twitter share shows GIF preview in compose window

❌ **Not working:**
- Twitter Card Validator shows "Image not accessible"
- Meta tags are missing or incorrect
- Twitter share shows no preview

## Next Steps

If testing shows the IPFS URLs don't work with Twitter:
1. We'll need to set up a proxy (Cloudflare Worker or similar)
2. Or use a CDN service to host the images
3. Or use Twitter's Media Upload API (requires backend)
