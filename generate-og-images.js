#!/usr/bin/env node

/**
 * generate-og-images.js — Create static JPG preview images for Twitter/OG cards.
 * Fetches NFT GIFs through the Cloudflare Worker proxy (edge cached),
 * extracts the first frame, resizes to 600x600, saves as JPG.
 *
 * Run: node generate-og-images.js
 * Requires: sharp (already installed)
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const PROXY_BASE = 'https://ipfs-proxy.lascaux42693169.workers.dev'
const CONCURRENCY = 5
const TIMEOUT_MS = 30000
const OG_SIZE = 600
const OG_QUALITY = 80

const OG_DIR_WINIONS = path.join(__dirname, 'public', 'og', 'winions')
const OG_DIR_CONCLAVE = path.join(__dirname, 'public', 'og', 'conclave')

function resolveToProxy(imageUrl) {
  if (!imageUrl) return null
  // Already a proxy URL
  if (imageUrl.includes('ipfs-proxy.lascaux42693169.workers.dev')) return imageUrl
  // Rewrite ipfs gateway URLs to proxy
  const match = imageUrl.match(/https?:\/\/[^/]+\/ipfs\/(.+)/)
  if (match) return `${PROXY_BASE}/ipfs/${match[1]}`
  return imageUrl
}

function loadCollection(filename) {
  const filePath = path.join(__dirname, 'src', 'data', filename)
  if (!fs.existsSync(filePath)) {
    console.error(`${filename} not found`)
    return []
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  return data.tokens || []
}

async function generateOne(token, outDir, label, index, total) {
  const { tokenId, imageUrl } = token
  const outPath = path.join(outDir, `${tokenId}.jpg`)

  if (fs.existsSync(outPath)) {
    console.log(`[${index + 1}/${total}] EXISTS ${label} #${tokenId}`)
    return 'exists'
  }

  const proxyUrl = resolveToProxy(imageUrl)
  if (!proxyUrl) {
    console.log(`[${index + 1}/${total}] SKIP (no URL) ${label} #${tokenId}`)
    return 'skip'
  }

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) {
      console.log(`[${index + 1}/${total}] FAIL (${res.status}) ${label} #${tokenId}`)
      return 'fail'
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // Extract first frame of GIF, resize, save as JPG
    await sharp(buffer, { animated: false })
      .resize(OG_SIZE, OG_SIZE, { fit: 'cover' })
      .jpeg({ quality: OG_QUALITY })
      .toFile(outPath)

    const stat = fs.statSync(outPath)
    console.log(`[${index + 1}/${total}] OK ${label} #${tokenId} (${(stat.size / 1024).toFixed(1)}KB)`)
    return 'ok'
  } catch (err) {
    console.log(`[${index + 1}/${total}] FAIL ${label} #${tokenId} ${err.message}`)
    return 'fail'
  }
}

async function processCollection(tokens, outDir, label) {
  console.log(`\n--- ${label} (${tokens.length} tokens) ---`)
  let ok = 0, exists = 0, skip = 0, fail = 0

  for (let i = 0; i < tokens.length; i += CONCURRENCY) {
    const batch = tokens.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map((token, j) => generateOne(token, outDir, label, i + j, tokens.length))
    )
    for (const r of results) {
      if (r === 'ok') ok++
      else if (r === 'exists') exists++
      else if (r === 'skip') skip++
      else fail++
    }
  }

  console.log(`${label}: ${ok} generated, ${exists} existed, ${skip} skipped, ${fail} failed`)
  return { ok, exists, skip, fail }
}

async function main() {
  fs.mkdirSync(OG_DIR_WINIONS, { recursive: true })
  fs.mkdirSync(OG_DIR_CONCLAVE, { recursive: true })

  console.log(`OG image size: ${OG_SIZE}x${OG_SIZE} JPG q${OG_QUALITY}`)
  console.log(`Proxy: ${PROXY_BASE}`)
  console.log(`Concurrency: ${CONCURRENCY}`)

  const winions = loadCollection('winions.json')
  const conclave = loadCollection('collection.json')

  const w = await processCollection(winions, OG_DIR_WINIONS, 'WINIONS')
  const c = await processCollection(conclave, OG_DIR_CONCLAVE, 'CONCLAVE')

  console.log(`\n=== TOTAL ===`)
  console.log(`Generated: ${w.ok + c.ok}`)
  console.log(`Already existed: ${w.exists + c.exists}`)
  console.log(`Failed: ${w.fail + c.fail}`)
  if (w.fail + c.fail > 0) {
    console.log('Re-run to retry failed (existing ones will be skipped)')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
