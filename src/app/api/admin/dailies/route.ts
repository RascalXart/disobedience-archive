import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DAILIES_PATH = path.join(process.cwd(), 'src/data/dailies.json')
const ALLOWED_STATUSES = new Set(['available', 'sold', 'not_listed', 'published'])
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_WRITES = 30
const writeRateLimit = new Map<string, { windowStart: number; count: number }>()

function getClientId(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return 'unknown'
}

function checkWriteRateLimit(clientId: string): boolean {
  const now = Date.now()
  const current = writeRateLimit.get(clientId)
  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    writeRateLimit.set(clientId, { windowStart: now, count: 1 })
    return true
  }
  if (current.count >= RATE_LIMIT_MAX_WRITES) return false
  current.count += 1
  writeRateLimit.set(clientId, current)
  return true
}

function getAdminKeyFromRequest(request: Request): string {
  const headerKey = request.headers.get('x-admin-key')
  if (headerKey) return headerKey
  const auth = request.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  return ''
}

function isAuthorized(request: Request): { ok: boolean; status?: number; message?: string } {
  const configuredKey = process.env.ADMIN_API_KEY
  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, status: 503, message: 'Admin API misconfigured' }
    }
    return { ok: true }
  }
  const providedKey = getAdminKeyFromRequest(request)
  if (!providedKey || providedKey !== configuredKey) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }
  return { ok: true }
}

function isValidDailyEntry(entry: unknown): entry is Record<string, unknown> {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
  const record = entry as Record<string, unknown>
  if (typeof record.id !== 'string' || record.id.length === 0) return false
  if (typeof record.imageUrl !== 'string' || record.imageUrl.length === 0) return false
  if (typeof record.savedDate !== 'string' || Number.isNaN(Date.parse(record.savedDate))) return false
  if (typeof record.status !== 'string' || !ALLOWED_STATUSES.has(record.status)) return false
  if (
    record.tags != null &&
    (!Array.isArray(record.tags) || !record.tags.every((tag) => typeof tag === 'string'))
  ) return false
  if (record.title != null && typeof record.title !== 'string') return false
  if (record.description != null && typeof record.description !== 'string') return false
  if (record.minted != null && typeof record.minted !== 'boolean') return false
  if (record.tokenId != null && typeof record.tokenId !== 'number') return false
  if (record.contractAddress != null && typeof record.contractAddress !== 'string') return false
  if (record.owner != null && typeof record.owner !== 'string') return false
  return true
}

function validateDailiesPayload(payload: unknown): payload is unknown[] {
  return Array.isArray(payload) && payload.length <= 10_000 && payload.every(isValidDailyEntry)
}

export async function GET(request: Request) {
  const auth = isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  return NextResponse.json(
    JSON.parse(fs.readFileSync(DAILIES_PATH, 'utf8')),
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function PUT(request: Request) {
  const auth = isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const clientId = getClientId(request)
  if (!checkWriteRateLimit(clientId)) {
    return NextResponse.json(
      { ok: false, error: 'Too many write requests' },
      { status: 429 }
    )
  }

  const dailies = await request.json()
  if (!validateDailiesPayload(dailies)) {
    return NextResponse.json({ ok: false, error: 'Invalid dailies payload' }, { status: 400 })
  }

  fs.writeFileSync(DAILIES_PATH, JSON.stringify(dailies, null, 2) + '\n')
  return NextResponse.json({ ok: true, count: dailies.length }, { headers: { 'Cache-Control': 'no-store' } })
}
