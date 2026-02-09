/**
 * IPFS proxy with edge cache. Logs: Cache HIT | Cache MISS + Gateway winner.
 * View real-time logs and cache effectiveness in Cloudflare Dashboard → Workers → ipfs-proxy → Logs.
 */

const GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
];

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then((r) => {
      clearTimeout(timeout);
      return r;
    })
    .catch((e) => {
      clearTimeout(timeout);
      throw e;
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

    type Winner = { gatewayUrl: string; response: Response };
    let winner: Winner | null = null;

    try {
      winner = await Promise.race(
        gatewayUrls.map((gatewayUrl) =>
          fetchWithTimeout(gatewayUrl, timeoutMs).then((r) =>
            r.ok ? { gatewayUrl, response: r } : Promise.reject(new Error('not ok'))
          )
        )
      );
    } catch {
      const settled = await Promise.allSettled(
        gatewayUrls.map((gatewayUrl) =>
          fetchWithTimeout(gatewayUrl, timeoutMs).then((r) => (r.ok ? { gatewayUrl, response: r } : null))
        )
      );
      const firstOk = settled.find(
        (s): s is PromiseFulfilledResult<Winner | null> =>
          s.status === 'fulfilled' && s.value != null
      );
      winner = firstOk?.value ?? null;
    }

    if (!winner || !winner.response.ok) {
      console.log('All gateways failed:', cidAndPath);
      return new Response('All gateways failed', { status: 504, headers: CACHE_HEADERS });
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
