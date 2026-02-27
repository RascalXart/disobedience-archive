import { prependBasePath } from '@/lib/base-path'

const GRID_PREVIEW_BASE = (typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_GRID_PREVIEW_BASE_URL ?? '')
  : '').replace(/\/$/, '')

function resolveGridPreviewPath(path: string): string {
  if (GRID_PREVIEW_BASE) return `${GRID_PREVIEW_BASE}${path}`
  return prependBasePath(path)
}

export function getWinionGridPreviewUrl(tokenId: string): string {
  return resolveGridPreviewPath(`/grid-previews/winions/${encodeURIComponent(tokenId)}.webp`)
}

export function getConclaveGridPreviewUrl(tokenId: string): string {
  return resolveGridPreviewPath(`/grid-previews/conclave/${encodeURIComponent(tokenId)}.webp`)
}

export function getDailyGridPreviewUrl(id: string): string {
  return resolveGridPreviewPath(`/grid-previews/dailies/${encodeURIComponent(id)}.webp`)
}
