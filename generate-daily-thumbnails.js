#!/usr/bin/env node

/**
 * generate-daily-thumbnails.js — Create WebP thumbnail previews for daily artwork images.
 * Fetches from R2 CDN, resizes with sharp, saves to public/thumbs/.
 * Run: node generate-daily-thumbnails.js
 * Requires: npm install sharp (already installed)
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const R2_BASE = process.env.R2_BASE_URL || 'https://pub-71ed1655b8674186957a0405561cd60a.r2.dev'
const CONCURRENCY = 5
const TIMEOUT_MS = 15000
const THUMB_SIZE = 200
const THUMB_QUALITY = 70
const THUMBS_DIR = path.join(__dirname, 'public', 'thumbs')

function loadDailies() {
  const filePath = path.join(__dirname, 'src', 'data', 'dailies.json')
  if (!fs.existsSync(filePath)) {
    console.error('dailies.json not found')
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

async function generateOne(daily, index, total) {
  const { id, imageUrl } = daily

  // Skip videos — sharp can't process mp4/mov
  if (imageUrl.endsWith('.mp4') || imageUrl.endsWith('.mov')) {
    console.log(`[${index + 1}/${total}] SKIP (video) ${id}`)
    return 'skip'
  }

  const outPath = path.join(THUMBS_DIR, `${id}.webp`)

  // Skip if already generated
  if (fs.existsSync(outPath)) {
    console.log(`[${index + 1}/${total}] EXISTS ${id}`)
    return 'exists'
  }

  // Extract filename from imageUrl (e.g., /dailies/rascal_daily_1.gif → rascal_daily_1.gif)
  const filename = imageUrl.split('/').pop()
  const fetchUrl = `${R2_BASE}/dailies/${filename}`

  try {
    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) {
      console.log(`[${index + 1}/${total}] FAIL (${res.status}) ${id}`)
      return 'fail'
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // For animated GIFs, sharp extracts the first frame by default
    await sharp(buffer, { animated: false })
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
      .webp({ quality: THUMB_QUALITY })
      .toFile(outPath)

    const stat = fs.statSync(outPath)
    console.log(`[${index + 1}/${total}] OK ${id} (${(stat.size / 1024).toFixed(1)}KB)`)
    return 'ok'
  } catch (err) {
    console.log(`[${index + 1}/${total}] FAIL ${id} ${err.message}`)
    return 'fail'
  }
}

async function main() {
  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true })
  }

  const dailies = loadDailies()
  const imageCount = dailies.filter(d => !d.imageUrl.endsWith('.mp4') && !d.imageUrl.endsWith('.mov')).length

  console.log(`Found ${dailies.length} dailies (${imageCount} images, ${dailies.length - imageCount} videos)`)
  console.log(`Output: ${THUMBS_DIR}`)
  console.log(`Size: ${THUMB_SIZE}x${THUMB_SIZE} WebP q${THUMB_QUALITY}`)
  console.log(`R2 base: ${R2_BASE}`)
  console.log(`Concurrency: ${CONCURRENCY}\n`)

  let ok = 0, exists = 0, skip = 0, fail = 0

  for (let i = 0; i < dailies.length; i += CONCURRENCY) {
    const batch = dailies.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map((daily, j) => generateOne(daily, i + j, dailies.length))
    )
    for (const r of results) {
      if (r === 'ok') ok++
      else if (r === 'exists') exists++
      else if (r === 'skip') skip++
      else fail++
    }
  }

  console.log(`\nDone: ${ok} generated, ${exists} already existed, ${skip} videos skipped, ${fail} failed`)
  if (fail > 0) {
    console.log('Re-run to retry failed thumbnails (existing ones will be skipped)')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
