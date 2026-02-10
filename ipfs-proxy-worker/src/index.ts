/**
 * IPFS proxy with edge cache. Logs: Cache HIT | Cache MISS + Gateway winner.
 * View real-time logs and cache effectiveness in Cloudflare Dashboard → Workers → ipfs-proxy → Logs.
 */

const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  ...CORS_HEADERS,
};

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal, redirect: 'follow' })
    .then((r) => {
      clearTimeout(timeout);
      return r;
    })
    .catch((e) => {
      clearTimeout(timeout);
      throw e;
    });
}

/** Race gateways, resolve on first 2xx response. Reject only if ALL fail. */
function raceForFirstOk(
  urls: string[],
  timeoutMs: number
): Promise<{ gatewayUrl: string; response: Response }> {
  let rejectCount = 0;
  return new Promise((resolve, reject) => {
    urls.forEach((gatewayUrl) => {
      fetchWithTimeout(gatewayUrl, timeoutMs)
        .then((r) => {
          if (r.ok) {
            resolve({ gatewayUrl, response: r });
          } else {
            rejectCount++;
            if (rejectCount === urls.length) reject(new Error('All gateways failed'));
          }
        })
        .catch(() => {
          rejectCount++;
          if (rejectCount === urls.length) reject(new Error('All gateways failed'));
        });
    });
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CACHE_HEADERS });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { ...CACHE_HEADERS } });
    }

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const match = url.pathname.match(/^\/ipfs\/(.+)$/);
    if (!match) {
      return new Response('Not found', { status: 404, headers: { ...CACHE_HEADERS } });
    }

    const cidAndPath = match[1];
    const timeoutMs = Math.min(parseInt(url.searchParams.get('timeout') || '10000', 10) || 10000, 30000);

    // Strip timeout from cache key so warm-cache (?timeout=30000) and site (no param) hit the same entry
    const cacheUrl = new URL(url.toString());
    cacheUrl.searchParams.delete('timeout');
    const cacheKey = new Request(cacheUrl.toString(), request);

    const cache = caches.default;
    let cached = await cache.match(cacheKey);
    if (cached) {
      console.log('Cache HIT:', cidAndPath);
      const headers = new Headers(cached.headers);
      Object.entries(CACHE_HEADERS).forEach(([k, v]) => headers.set(k, v));
      return new Response(cached.body, { status: cached.status, headers });
    }

    console.log('Cache MISS:', cidAndPath);

    const gatewayUrls = GATEWAYS.map((g) => g + cidAndPath);

    let winner: { gatewayUrl: string; response: Response } | null = null;

    try {
      winner = await raceForFirstOk(gatewayUrls, timeoutMs);
    } catch {
      // all gateways failed
    }

    if (!winner) {
      console.log('All gateways failed:', cidAndPath);
      return new Response('All gateways failed', {
        status: 504,
        headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' },
      });
    }

    console.log('Gateway winner:', winner.gatewayUrl);

    const headers = new Headers(winner.response.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    // ETag from gateway is passed through for better browser caching

    const responseToReturn = new Response(winner.response.body, {
      status: winner.response.status,
      headers,
    });
    const forCache = responseToReturn.clone();
    ctx.waitUntil(cache.put(cacheKey, forCache));

    return responseToReturn;
  },
};
