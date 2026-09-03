// Storage behind idempotent paid retry.
//
// In-process memory is the default and is enough for the common case: a buyer
// retrying within the same warm serverless instance. It does NOT survive a cold
// start or reach a sibling instance, so a retry routed elsewhere can still be
// charged twice.
//
// Setting IDEMPOTENCY_KV_REST_URL and IDEMPOTENCY_KV_REST_TOKEN promotes the
// store to a shared one over the Upstash-compatible REST protocol that Vercel KV
// also speaks. Durability then becomes configuration rather than a rewrite.
//
// The shared store is best-effort by design: a slow or failing backend must
// never delay or break a paid response, so every call is short-timeout and
// falls back to memory.

const MEMORY_MAX_ENTRIES = 500;
const REST_TIMEOUT_MS = 700;
const memory = new Map();

function restConfig() {
  const url = (process.env.IDEMPOTENCY_KV_REST_URL || '').replace(/\/+$/, '');
  const token = process.env.IDEMPOTENCY_KV_REST_TOKEN || '';
  return url && token ? { url, token } : null;
}

export function storeBackend() {
  return restConfig() ? 'shared-rest-kv' : 'in-process-memory';
}

export function replayScope() {
  return restConfig() ? 'best-effort shared-store replay' : 'best-effort warm-runtime replay';
}

function pruneMemory() {
  const now = Date.now();
  for (const [key, entry] of memory) if (entry.expiresAt <= now) memory.delete(key);
  while (memory.size > MEMORY_MAX_ENTRIES) memory.delete(memory.keys().next().value);
}

function memoryGet(key) {
  pruneMemory();
  const entry = memory.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

function memorySet(key, value, ttlMs) {
  pruneMemory();
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function rest(path, { method = 'GET', body } = {}) {
  const config = restConfig();
  if (!config) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.url}${path}`, {
      method,
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // A shared-store outage degrades to memory rather than failing the purchase.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function readReplay(key) {
  const local = memoryGet(key);
  if (local) return local;
  const payload = await rest(`/get/${encodeURIComponent(key)}`);
  const raw = payload?.result;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    // Warm the local copy so a burst of retries costs one round trip.
    memorySet(key, value, 60_000);
    return value;
  } catch {
    return null;
  }
}

export async function writeReplay(key, value, ttlMs) {
  memorySet(key, value, ttlMs);
  await rest(`/set/${encodeURIComponent(key)}?EX=${Math.max(1, Math.round(ttlMs / 1000))}`, {
    method: 'POST',
    body: JSON.stringify(value),
  });
}

// Test seam: the memory tier is process-global, so a suite that asserts on a
// cold start needs a way to simulate one.
export function __clearMemoryForTests() {
  memory.clear();
}
