#!/usr/bin/env node

/**
 * warm-cache.js — Pre-populate the Cloudflare IPFS proxy cache for all NFT images.
 * Run: node warm-cache.js
 * Requires Node 18+ (built-in fetch).
 */

const fs = require('fs')
const path = require('path')

const PROXY_BASE = process.env.IPFS_PROXY_URL || 'https://ipfs-proxy.lascaux42693169.workers.dev'
const CONCURRENCY = 5
const TIMEOUT_MS = 45000

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

function loadImageUrls() {
  const urls = new Set()
  const dataDir = path.join(__dirname, 'src', 'data')

  for (const file of ['winions.json', 'collection.json']) {
    const filePath = path.join(dataDir, file)
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} (not found)`)
      continue
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const tokens = data.tokens || []
    for (const token of tokens) {
      if (token.imageUrl) {
        const cidPath = extractCidAndPath(token.imageUrl)
        if (cidPath) {
          urls.add(`${PROXY_BASE}/ipfs/${cidPath}?timeout=30000`)
        }
      }
    }
  }

  return [...urls]
}

async function warmOne(url, index, total) {
  const label = url.replace(`${PROXY_BASE}/ipfs/`, '').slice(0, 40)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    // Consume body to ensure full transfer (needed for cache population)
    await res.arrayBuffer()
    const status = res.ok ? 'OK' : `FAIL (${res.status})`
    console.log(`[${index + 1}/${total}] ${status}  ${label}`)
    return res.ok
  } catch (err) {
    console.log(`[${index + 1}/${total}] FAIL  ${label}  ${err.message}`)
    return false
  }
}

async function main() {
  const urls = loadImageUrls()
  console.log(`Found ${urls.length} unique IPFS image URLs to warm`)
  console.log(`Proxy: ${PROXY_BASE}`)
  console.log(`Concurrency: ${CONCURRENCY}, Timeout: ${TIMEOUT_MS}ms\n`)

  let ok = 0
  let fail = 0
  const failed = []

  // Process in batches of CONCURRENCY
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map((url, j) => warmOne(url, i + j, urls.length))
    )
    for (let j = 0; j < results.length; j++) {
      if (results[j]) {
        ok++
      } else {
        fail++
        failed.push(urls[i + j])
      }
    }
  }

  console.log(`\nDone: ${ok}/${urls.length} succeeded, ${fail} failed`)
  if (failed.length > 0) {
    console.log('\nFailed URLs:')
    for (const u of failed) {
      console.log(`  ${u}`)
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
