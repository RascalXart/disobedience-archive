#!/usr/bin/env node

/**
 * Generate compressed animated WebP grid previews for:
 * - WINIØNS
 * - CØNCLAVE
 * - Rascal dailies (images only)
 *
 * Output:
 *   public/grid-previews/winions/{tokenId}.webp
 *   public/grid-previews/conclave/{tokenId}.webp
 *   public/grid-previews/dailies/{id}.webp
 *
 * Usage examples:
 *   node scripts/generate-grid-previews.js
 *   node scripts/generate-grid-previews.js --collection winions --limit 50
 *   node scripts/generate-grid-previews.js --overwrite
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const args = process.argv.slice(2)
const argValue = (flag, fallback = null) => {
  const i = args.indexOf(flag)
  if (i < 0) return fallback
  return args[i + 1] ?? fallback
}
const hasFlag = (flag) => args.includes(flag)

const collectionFilter = (argValue('--collection', 'all') || 'all').toLowerCase()
const limit = Number(argValue('--limit', '0')) || 0
const overwrite = hasFlag('--overwrite')

const IPFS_PROXY_BASE = (process.env.NEXT_PUBLIC_IPFS_PROXY || process.env.IPFS_PROXY_URL || 'https://ipfs-proxy.lascaux42693169.workers.dev').replace(/\/$/, '')
const R2_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || process.env.R2_BASE_URL || 'https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies').replace(/\/$/, '')
const CONCURRENCY = Number(process.env.GRID_PREVIEW_CONCURRENCY || 5)
const TIMEOUT_MS = Number(process.env.GRID_PREVIEW_TIMEOUT_MS || 45000)
const PREVIEW_SIZE = Number(process.env.GRID_PREVIEW_SIZE || 240)
const PREVIEW_QUALITY = Number(process.env.GRID_PREVIEW_QUALITY || 48)
const ROOT = path.join(__dirname, '..')
const OUT_ROOT = path.join(ROOT, 'public', 'grid-previews')

function parseIpfsPath(ipfsUrl) {
  if (!ipfsUrl) return null
  if (ipfsUrl.startsWith('ipfs://')) {
    const parts = ipfsUrl.replace('ipfs://', '').split('/')
    const cid = parts[0]
    const rest = parts.slice(1).join('/')
    return rest ? `${cid}/${rest}` : cid
  }
  if (ipfsUrl.includes('/ipfs/')) {
    const match = ipfsUrl.match(/\/ipfs\/([^?]+)/)
    return match ? match[1] : null
  }
  return null
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadJobs() {
  const jobs = []

  if (collectionFilter === 'all' || collectionFilter === 'winions') {
    const winions = readJson(path.join(ROOT, 'src', 'data', 'winions.json'))
    for (const nft of winions.tokens || []) {
      const ipfsPath = parseIpfsPath(nft.imageUrl)
      if (!ipfsPath) continue
      jobs.push({
        key: `winions/${nft.tokenId}`,
        outPath: path.join(OUT_ROOT, 'winions', `${nft.tokenId}.webp`),
        sourceUrl: `${IPFS_PROXY_BASE}/ipfs/${ipfsPath}?timeout=30000`,
        localFallbackPath: path.join(ROOT, 'public', 'thumbs', `${ipfsPath.replace(/\//g, '_')}.webp`),
      })
    }
  }

  if (collectionFilter === 'all' || collectionFilter === 'conclave') {
    const conclave = readJson(path.join(ROOT, 'src', 'data', 'collection.json'))
    for (const nft of conclave.tokens || []) {
      const ipfsPath = parseIpfsPath(nft.imageUrl)
      if (!ipfsPath) continue
      jobs.push({
        key: `conclave/${nft.tokenId}`,
        outPath: path.join(OUT_ROOT, 'conclave', `${nft.tokenId}.webp`),
        sourceUrl: `${IPFS_PROXY_BASE}/ipfs/${ipfsPath}?timeout=30000`,
        localFallbackPath: path.join(ROOT, 'public', 'thumbs', `${ipfsPath.replace(/\//g, '_')}.webp`),
      })
    }
  }

  if (collectionFilter === 'all' || collectionFilter === 'dailies') {
    const dailies = readJson(path.join(ROOT, 'src', 'data', 'dailies.json'))
    for (const daily of dailies) {
      const imageUrl = daily.imageUrl || ''
      if (!imageUrl || imageUrl.endsWith('.mp4') || imageUrl.endsWith('.mov')) continue
      const filename = imageUrl.split('/').pop()
      if (!filename) continue
      jobs.push({
        key: `dailies/${daily.id}`,
        outPath: path.join(OUT_ROOT, 'dailies', `${daily.id}.webp`),
        sourceUrl: `${R2_BASE.includes('/dailies') ? R2_BASE : `${R2_BASE}/dailies`}/${filename}`,
        localFallbackPath: path.join(ROOT, 'public', 'thumbs', `${daily.id}.webp`),
      })
    }
  }

  const dedup = new Map()
  for (const job of jobs) dedup.set(job.key, job)
  const unique = Array.from(dedup.values())
  return limit > 0 ? unique.slice(0, limit) : unique
}

async function fetchBuffer(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function encodePreview(inputBuffer, outPath) {
  // Animated input keeps animation; static input outputs static WebP.
  await sharp(inputBuffer, { animated: true, pages: -1, limitInputPixels: false })
    .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'cover', withoutEnlargement: true })
    .webp({
      quality: PREVIEW_QUALITY,
      effort: 4,
      smartSubsample: true,
      loop: 0,
    })
    .toFile(outPath)
}

async function runJob(job, index, total) {
  ensureDir(path.dirname(job.outPath))
  if (!overwrite && fs.existsSync(job.outPath)) {
    console.log(`[${index + 1}/${total}] SKIP  ${job.key}`)
    return 'skip'
  }
  try {
    const buffer = await fetchBuffer(job.sourceUrl)
    await encodePreview(buffer, job.outPath)
    const sizeKb = (fs.statSync(job.outPath).size / 1024).toFixed(1)
    console.log(`[${index + 1}/${total}] OK    ${job.key} (${sizeKb} KB)`)
    return 'ok'
  } catch (err) {
    try {
      if (job.localFallbackPath && fs.existsSync(job.localFallbackPath)) {
        const fallbackBuffer = fs.readFileSync(job.localFallbackPath)
        await encodePreview(fallbackBuffer, job.outPath)
        const sizeKb = (fs.statSync(job.outPath).size / 1024).toFixed(1)
        console.log(`[${index + 1}/${total}] OK*   ${job.key} (${sizeKb} KB, local thumb fallback)`)
        return 'ok'
      }
    } catch (fallbackErr) {
      console.log(`[${index + 1}/${total}] FAIL  ${job.key} - ${fallbackErr.message}`)
      return 'fail'
    }
    console.log(`[${index + 1}/${total}] FAIL  ${job.key} - ${err.message}`)
    return 'fail'
  }
}

async function main() {
  ensureDir(OUT_ROOT)
  const jobs = loadJobs()

  console.log(`Grid preview generation starting`)
  console.log(`Collection filter: ${collectionFilter}`)
  console.log(`Jobs: ${jobs.length}`)
  console.log(`Preview size: ${PREVIEW_SIZE}px`)
  console.log(`Quality: ${PREVIEW_QUALITY}`)
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Output root: ${OUT_ROOT}\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map((job, offset) => runJob(job, i + offset, jobs.length)))
    for (const result of results) {
      if (result === 'ok') ok++
      else if (result === 'skip') skip++
      else fail++
    }
  }

  console.log(`\nDone: ${ok} generated, ${skip} skipped, ${fail} failed`)
  if (fail > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`)
  process.exit(1)
})
