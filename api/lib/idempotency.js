import { createHash } from 'node:crypto';

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map();

function prune() {
  const now = Date.now();
  for (const [key, value] of cache) if (value.expiresAt <= now) cache.delete(key);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function requestFingerprint(req) {
  const query = stable(req.query || {});
  const body = stable(req.body || null);
  return JSON.stringify({ method: req.method, path: req.path, query, body });
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedKey(req) {
  const explicit = req.get('Idempotency-Key');
  if (explicit) {
    const value = String(explicit).trim();
    if (value.length < 8 || value.length > 200) throw new Error('Idempotency-Key must be 8-200 characters');
    return `client:${value}`;
  }
  const payment = req.get('PAYMENT-SIGNATURE') || req.get('X-PAYMENT') || req.get('X-PAYMENT-SIGNATURE');
  return payment ? `payment:${hash(String(payment))}` : null;
}

export function idempotencyMiddleware({ ttlMs = DEFAULT_TTL_MS } = {}) {
  return function milliapiIdempotency(req, res, next) {
    let sourceKey;
    try { sourceKey = normalizedKey(req); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    if (!sourceKey) return next();

    prune();
    const fingerprint = requestFingerprint(req);
    const cacheKey = hash(`${sourceKey}\n${fingerprint}`);
    const existing = cache.get(cacheKey);
    if (existing && existing.expiresAt > Date.now()) {
      res.setHeader('X-Idempotent-Replay', 'true');
      res.setHeader('X-Idempotency-Scope', 'best-effort-warm-runtime');
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(existing.status).json(existing.body);
    }

    const originalJson = res.json.bind(res);
    res.json = body => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prune();
        cache.set(cacheKey, { status: res.statusCode, body, expiresAt: Date.now() + ttlMs });
        res.setHeader('X-Idempotent-Replay', 'false');
        res.setHeader('X-Idempotency-Scope', 'best-effort-warm-runtime');
      }
      return originalJson(body);
    };
    return next();
  };
}
