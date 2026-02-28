#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_ROOT="$ROOT/public/grid-previews"

COLLECTION="all"
LIMIT=0
OVERWRITE=0

CONCURRENCY="${GRID_PREVIEW_CONCURRENCY:-4}"
SIZE="${GRID_PREVIEW_SIZE:-220}"
FPS="${GRID_PREVIEW_FPS:-10}"
QUALITY="${GRID_PREVIEW_QUALITY:-42}"
TIMEOUT_S="${GRID_PREVIEW_TIMEOUT_S:-45}"
FALLBACK_SIZE="${GRID_PREVIEW_FALLBACK_SIZE:-180}"
FALLBACK_FPS="${GRID_PREVIEW_FALLBACK_FPS:-6}"
FALLBACK_QUALITY="${GRID_PREVIEW_FALLBACK_QUALITY:-34}"

IPFS_PROXY_BASE="${NEXT_PUBLIC_IPFS_PROXY:-${IPFS_PROXY_URL:-https://ipfs-proxy.lascaux42693169.workers.dev}}"
IPFS_PROXY_BASE="${IPFS_PROXY_BASE%/}"
R2_BASE="${NEXT_PUBLIC_MEDIA_BASE_URL:-${R2_BASE_URL:-https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies}}"
R2_BASE="${R2_BASE%/}"
if [[ "$R2_BASE" != */dailies ]]; then
  R2_BASE="$R2_BASE/dailies"
fi

usage() {
  cat <<EOF
Generate lightweight animated WebP previews for grid pages.

Usage:
  bash scripts/generate-grid-previews.sh [options]

Options:
  --collection <all|winions|conclave|dailies>   Collection filter (default: all)
  --limit <n>                                    Only process first n items (default: 0 = all)
  --overwrite                                    Regenerate existing files
  --size <n>                                     Square output size in px (default: ${SIZE})
  --fps <n>                                      Output framerate (default: ${FPS})
  --quality <n>                                  WebP quality 0-100 (default: ${QUALITY})
  --concurrency <n>                              Parallel jobs (default: ${CONCURRENCY})
  --timeout <seconds>                            Download timeout (default: ${TIMEOUT_S})
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --collection)
      COLLECTION="${2:-}"
      shift 2
      ;;
    --limit)
      LIMIT="${2:-0}"
      shift 2
      ;;
    --overwrite)
      OVERWRITE=1
      shift
      ;;
    --size)
      SIZE="${2:-220}"
      shift 2
      ;;
    --fps)
      FPS="${2:-10}"
      shift 2
      ;;
    --quality)
      QUALITY="${2:-42}"
      shift 2
      ;;
    --concurrency)
      CONCURRENCY="${2:-4}"
      shift 2
      ;;
    --timeout)
      TIMEOUT_S="${2:-45}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

case "$COLLECTION" in
  all|winions|conclave|dailies) ;;
  *)
    echo "Invalid --collection value: $COLLECTION"
    exit 1
    ;;
esac

mkdir -p "$OUT_ROOT/winions" "$OUT_ROOT/conclave" "$OUT_ROOT/dailies"

JOB_FILE="$(mktemp "${TMPDIR:-/tmp}/grid-preview-jobs.XXXXXX")"
STATUS_FILE="$(mktemp "${TMPDIR:-/tmp}/grid-preview-status.XXXXXX")"
trap 'rm -f "$JOB_FILE" "$STATUS_FILE"' EXIT

node - "$ROOT" "$COLLECTION" "$LIMIT" "$IPFS_PROXY_BASE" "$R2_BASE" <<'NODE' > "$JOB_FILE"
const fs = require('fs')
const path = require('path')

const [root, collection, limitRaw, ipfsProxyBase, r2Base] = process.argv.slice(2)
const limit = Number(limitRaw) || 0

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'))
}

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

const jobs = []

if (collection === 'all' || collection === 'winions') {
  const winions = readJson('src/data/winions.json')
  for (const nft of winions.tokens || []) {
    const ipfsPath = parseIpfsPath(nft.imageUrl)
    if (!ipfsPath) continue
    jobs.push({
      key: `winions/${nft.tokenId}`,
      outRel: `public/grid-previews/winions/${nft.tokenId}.webp`,
      url: `${ipfsProxyBase}/ipfs/${ipfsPath}?timeout=30000`,
      mode: 'animated',
    })
  }
}

if (collection === 'all' || collection === 'conclave') {
  const conclave = readJson('src/data/collection.json')
  for (const nft of conclave.tokens || []) {
    const ipfsPath = parseIpfsPath(nft.imageUrl)
    if (!ipfsPath) continue
    jobs.push({
      key: `conclave/${nft.tokenId}`,
      outRel: `public/grid-previews/conclave/${nft.tokenId}.webp`,
      url: `${ipfsProxyBase}/ipfs/${ipfsPath}?timeout=30000`,
      mode: 'animated',
    })
  }
}

if (collection === 'all' || collection === 'dailies') {
  const dailies = readJson('src/data/dailies.json')
  for (const daily of dailies) {
    const imageUrl = (daily.imageUrl || '').toLowerCase()
    if (!imageUrl || imageUrl.endsWith('.mp4') || imageUrl.endsWith('.mov')) continue
    const filename = daily.imageUrl.split('/').pop()
    if (!filename) continue
    jobs.push({
      key: `dailies/${daily.id}`,
      outRel: `public/grid-previews/dailies/${daily.id}.webp`,
      url: `${r2Base}/${filename}`,
      mode: imageUrl.endsWith('.gif') ? 'animated' : 'static',
    })
  }
}

const dedup = new Map()
for (const job of jobs) dedup.set(job.key, job)
const unique = Array.from(dedup.values())
const selected = limit > 0 ? unique.slice(0, limit) : unique

for (const job of selected) {
  console.log(`${job.key}\t${job.outRel}\t${job.url}\t${job.mode || 'animated'}`)
}
NODE

TOTAL="$(wc -l < "$JOB_FILE" | tr -d ' ')"
if [[ "$TOTAL" -eq 0 ]]; then
  echo "No jobs to run."
  exit 0
fi

echo "Grid preview generation starting"
echo "Collection filter: $COLLECTION"
echo "Jobs: $TOTAL"
echo "Output root: $OUT_ROOT"
echo "Size: ${SIZE}px | FPS: ${FPS} | Quality: ${QUALITY} | Concurrency: ${CONCURRENCY} | Timeout: ${TIMEOUT_S}s"
echo "Animated fallback: ${FALLBACK_SIZE}px @ ${FALLBACK_FPS}fps, quality ${FALLBACK_QUALITY}"
echo

file_size_bytes() {
  local file="$1"
  if stat -f%z "$file" >/dev/null 2>&1; then
    stat -f%z "$file"
  else
    stat -c%s "$file"
  fi
}

process_job() {
  local idx="$1"
  local key="$2"
  local outRel="$3"
  local url="$4"
  local mode="${5:-animated}"
  local outPath="$ROOT/$outRel"

  if [[ -f "$outPath" && "$OVERWRITE" -eq 0 ]]; then
    echo "skip" >> "$STATUS_FILE"
    echo "[$idx/$TOTAL] SKIP  $key"
    return 0
  fi

  local tmpIn
  local tmpOut
  if ! tmpIn="$(mktemp "${TMPDIR:-/tmp}/grid-preview-in.XXXXXX")"; then
    echo "fail" >> "$STATUS_FILE"
    echo "[$idx/$TOTAL] FAIL  $key - could not create temp input file"
    return 0
  fi
  if ! tmpOut="$(mktemp "${TMPDIR:-/tmp}/grid-preview-out.XXXXXX")"; then
    rm -f "$tmpIn"
    echo "fail" >> "$STATUS_FILE"
    echo "[$idx/$TOTAL] FAIL  $key - could not create temp output file"
    return 0
  fi

  if ! curl -sS --fail --max-time "$TIMEOUT_S" --retry 4 --retry-delay 1 --retry-all-errors "$url" -o "$tmpIn" </dev/null; then
    rm -f "$tmpIn" "$tmpOut"
    echo "fail" >> "$STATUS_FILE"
    echo "[$idx/$TOTAL] FAIL  $key - download failed"
    return 0
  fi

  if [[ "$mode" == "static" ]]; then
    if ! node - "$tmpIn" "$tmpOut" "$SIZE" "$QUALITY" <<'NODE'
const sharp = require('sharp')
const [inPath, outPath, sizeRaw, qualityRaw] = process.argv.slice(2)
const size = Number(sizeRaw)
const quality = Number(qualityRaw)
sharp(inPath, { limitInputPixels: false })
  .resize(size, size, { fit: 'cover', position: 'centre' })
  .webp({ quality, effort: 4, smartSubsample: true })
  .toFile(outPath)
  .catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
NODE
    then
      rm -f "$tmpIn" "$tmpOut"
      echo "fail" >> "$STATUS_FILE"
      echo "[$idx/$TOTAL] FAIL  $key - static encode failed"
      return 0
    fi
  else
    if ! ffmpeg -y -nostdin -loglevel error -i "$tmpIn" -an \
      -vf "fps=${FPS},scale=${SIZE}:${SIZE}:force_original_aspect_ratio=increase:flags=lanczos,crop=${SIZE}:${SIZE}" \
      -c:v libwebp_anim -quality "$QUALITY" -compression_level 6 -loop 0 -f webp \
      "$tmpOut" </dev/null; then
      if ! ffmpeg -y -nostdin -loglevel error -i "$tmpIn" -an \
        -vf "fps=${FALLBACK_FPS},scale=${FALLBACK_SIZE}:${FALLBACK_SIZE}:force_original_aspect_ratio=increase:flags=lanczos,crop=${FALLBACK_SIZE}:${FALLBACK_SIZE}" \
        -c:v libwebp_anim -quality "$FALLBACK_QUALITY" -compression_level 6 -loop 0 -f webp \
        "$tmpOut" </dev/null; then
        rm -f "$tmpIn" "$tmpOut"
        echo "fail" >> "$STATUS_FILE"
        echo "[$idx/$TOTAL] FAIL  $key - animated encode failed"
        return 0
      fi
    fi
  fi

  mkdir -p "$(dirname "$outPath")"
  mv "$tmpOut" "$outPath"
  rm -f "$tmpIn"

  local sizeBytes
  local sizeKb
  sizeBytes="$(file_size_bytes "$outPath")"
  sizeKb="$(awk -v s="$sizeBytes" 'BEGIN { printf "%.1f", s/1024 }')"
  echo "ok" >> "$STATUS_FILE"
  echo "[$idx/$TOTAL] OK    $key (${sizeKb} KB)"
}

running_jobs() {
  jobs -rp | wc -l | tr -d ' '
}

idx=0
while IFS=$'\t' read -r key outRel url mode; do
  idx=$((idx + 1))
  process_job "$idx" "$key" "$outRel" "$url" "${mode:-animated}" </dev/null &
  while [[ "$(running_jobs)" -ge "$CONCURRENCY" ]]; do
    sleep 0.1
  done
done < "$JOB_FILE"

wait || true

OK_COUNT="$(grep -c '^ok$' "$STATUS_FILE" || true)"
SKIP_COUNT="$(grep -c '^skip$' "$STATUS_FILE" || true)"
FAIL_COUNT="$(grep -c '^fail$' "$STATUS_FILE" || true)"
PROCESSED_COUNT=$((OK_COUNT + SKIP_COUNT + FAIL_COUNT))
if [[ "$PROCESSED_COUNT" -lt "$TOTAL" ]]; then
  MISSING_COUNT=$((TOTAL - PROCESSED_COUNT))
  FAIL_COUNT=$((FAIL_COUNT + MISSING_COUNT))
  echo "WARN: ${MISSING_COUNT} jobs exited before recording status."
fi

echo
echo "Done: ${OK_COUNT} generated, ${SKIP_COUNT} skipped, ${FAIL_COUNT} failed"
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
