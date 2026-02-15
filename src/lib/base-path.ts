/**
 * Shared basePath logic for client/server modules.
 * Mirrors next.config.mjs behavior so URL generation stays consistent.
 */

const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH
const isProduction = process.env.NODE_ENV === 'production'

function normalizeBasePath(raw: string | undefined): string {
  if (!isProduction) return ''
  if (!raw || raw === '/' || raw === 'ROOT' || raw.trim() === '') return ''
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withLeadingSlash.replace(/\/+$/, '')
}

export const BASE_PATH = normalizeBasePath(basePathEnv)

export function prependBasePath(pathOrUrl: string): string {
  if (!pathOrUrl.startsWith('/')) return pathOrUrl
  if (!BASE_PATH) return pathOrUrl
  if (pathOrUrl.startsWith(BASE_PATH)) return pathOrUrl
  return `${BASE_PATH}${pathOrUrl}`
}
