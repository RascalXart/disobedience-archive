#!/usr/bin/env node

/**
 * generate-thumbnails.js — Create WebP thumbnail previews for all NFT images.
 * Fetches from the Cloudflare proxy cache, resizes with sharp, saves to public/thumbs/.
 * Run: node generate-thumbnails.js
 * Requires: npm install sharp (already installed)
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const PROXY_BASE = process.env.IPFS_PROXY_URL || 'https://ipfs-proxy.lascaux42693169.workers.dev'
const CONCURRENCY = 5
const TIMEOUT_MS = 30000
const THUMB_SIZE = 200
const THUMB_QUALITY = 70
const THUMBS_DIR = path.join(__dirname, 'public', 'thumbs')

function extractCidAndPath(ipfsUrl) {
  if (!ipfsUrl) return null
  let cid = ''
  let rest = ''

  if (ipfsUrl.startsWith('ipfs://')) {
    const parts = ipfsUrl.replace('ipfs://', '').split('/')
    cid = parts[0]
    rest = parts.slice(1).join('/')
  } else if (ipfsUrl.includes('/ipfs/')) {
    const match = ipfsUrl.match(/\/ipfs\/([^?]+)/)
    if (!match) return null
    const parts = match[1].split('/')
    cid = parts[0]
    rest = parts.slice(1).join('/')
  } else if (!ipfsUrl.startsWith('http')) {
    cid = ipfsUrl
  } else {
    return null
  }

  if (!cid) return null
  return rest ? `${cid}/${rest}` : cid
}

/** Convert CID/path to a safe filename: QmXyz.../media → QmXyz____media */
function cidPathToFilename(cidPath) {
  return cidPath.replace(/\//g, '_')
}

function loadTokens() {
  const tokens = []
  const dataDir = path.join(__dirname, 'src', 'data')

  for (const file of ['winions.json', 'collection.json']) {
    const filePath = path.join(dataDir, file)
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} (not found)`)
      continue
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    for (const token of data.tokens || []) {
      if (token.imageUrl) {
        const cidPath = extractCidAndPath(token.imageUrl)
        if (cidPath) {
          tokens.push({ cidPath, imageUrl: token.imageUrl, collection: file })
        }
      }
    }
  }

  // Deduplicate by cidPath
  const seen = new Set()
  return tokens.filter((t) => {
    if (seen.has(t.cidPath)) return false
    seen.add(t.cidPath)
    return true
  })
}

async function generateOne(token, index, total) {
  const { cidPath } = token
  const filename = cidPathToFilename(cidPath) + '.webp'
  const outPath = path.join(THUMBS_DIR, filename)
  const label = cidPath.slice(0, 40)

  // Skip if already generated
  if (fs.existsSync(outPath)) {
    console.log(`[${index + 1}/${total}] SKIP  ${label}`)
    return true
  }

  const proxyUrl = `${PROXY_BASE}/ipfs/${cidPath}?timeout=20000`

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) {
      console.log(`[${index + 1}/${total}] FAIL (${res.status})  ${label}`)
      return false
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    await sharp(buffer)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
      .webp({ quality: THUMB_QUALITY })
      .toFile(outPath)

    const stat = fs.statSync(outPath)
    console.log(`[${index + 1}/${total}] OK  ${label}  (${(stat.size / 1024).toFixed(1)}KB)`)
    return true
  } catch (err) {
    console.log(`[${index + 1}/${total}] FAIL  ${label}  ${err.message}`)
    return false
  }
}

async function main() {
  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true })
  }

  const tokens = loadTokens()
  console.log(`Found ${tokens.length} unique images to thumbnail`)
  console.log(`Output: ${THUMBS_DIR}`)
  console.log(`Size: ${THUMB_SIZE}x${THUMB_SIZE} WebP q${THUMB_QUALITY}`)
  console.log(`Concurrency: ${CONCURRENCY}\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (let i = 0; i < tokens.length; i += CONCURRENCY) {
    const batch = tokens.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map((token, j) => generateOne(token, i + j, tokens.length))
    )
    for (const result of results) {
      if (result) ok++
      else fail++
    }
  }

  // Count skipped (already existed)
  const existingCount = tokens.filter((t) => {
    const filename = cidPathToFilename(t.cidPath) + '.webp'
    return fs.existsSync(path.join(THUMBS_DIR, filename))
  }).length

  console.log(`\nDone: ${ok} succeeded, ${fail} failed, ${existingCount} total thumbnails on disk`)
  if (fail > 0) {
    console.log('Re-run to retry failed thumbnails (existing ones will be skipped)')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
