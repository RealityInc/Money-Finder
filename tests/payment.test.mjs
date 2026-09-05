import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fastUnpaidChallenge } from '../api/lib/fast-x402-challenge.js';
import { idempotencyMiddleware } from '../api/lib/idempotency.js';

const PAY_TO = '0x000000000000000000000000000000000000dEaD';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function context({ method = 'GET', query = {}, headers = {}, url = '/api/audit-and-fix?url=https%3A%2F%2Fexample.com', valueProof = null, purchaseRecommended } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const req = {
    method, query, url, originalUrl: url, headers: lower, path: '/api/audit-and-fix',
    get(name) { return lower[String(name).toLowerCase()] ?? null; },
    x402ValueProof: valueProof,
    x402PurchaseRecommended: purchaseRecommended,
  };
  const sent = {};
  const listeners = new Map();
  let settled;
  const done = new Promise(resolve => { settled = resolve; });

  // Mirrors the parts of an Express response the production code actually uses:
  // a mutable statusCode, setHeader/getHeader, and a 'finish' event that the
  // telemetry layer subscribes to.
  const res = {
    statusCode: 200,
    setHeader(name, value) { sent[String(name).toLowerCase()] = value; },
    getHeader(name) { return sent[String(name).toLowerCase()]; },
    once(event, callback) { listeners.set(event, callback); return res; },
    status(code) { res.statusCode = code; return res; },
    json(value) { finish(value); return res; },
    end() { finish(null); return res; },
  };

  function finish(body) {
    const result = { status: res.statusCode, body, headers: sent };
    const onFinish = listeners.get('finish');
    if (onFinish) onFinish();
    settled(result);
  }

  return { req, res, done };
}

const challenge = fastUnpaidChallenge({
  route: '/api/audit-and-fix',
  amount: 3000,
  payTo: PAY_TO,
  description: 'Audit one public website for AI/agent readiness and return prioritized findings, evidence and ready-to-apply repair artifacts in one call.',
  serviceName: 'MilliAPI',
  tags: ['ai-agents', 'web-audit'],
});

describe('x402 protocol version negotiation', () => {
  // v2 renamed the fields a client needs in order to pay. A v1-only client that receives a v2 body
  // cannot construct a payment and its only option is to leave, which in traffic logs looks
  // identical to declining the offer. These tests pin the v1 challenge that keeps it able to buy.

  it('serves v2 by default and says v1 is available', async () => {
    const { req, res, done } = context();
    challenge(req, res, () => {});
    const { status, body, headers } = await done;
    assert.equal(status, 402);
    assert.equal(body.x402Version, 2);
    assert.equal(headers['x-x402-version-served'], '2');
    assert.deepEqual(body.protocolVersions.supported, [1, 2]);
    assert.match(body.protocolVersions.requestV1, /x402Version=1/);
  });

  for (const [label, ctx] of [
    ['a query parameter', { query: { x402Version: '1' }, url: '/api/audit-and-fix?url=https%3A%2F%2Fexample.com&x402Version=1' }],
    ['an x402-version header', { headers: { 'x402-version': '1' } }],
    ['an Accept media type', { headers: { accept: 'application/vnd.x402.v1+json' } }],
  ]) {
    it(`serves a v1 challenge when asked via ${label}`, async () => {
      const { req, res, done } = context(ctx);
      challenge(req, res, () => {});
      const { status, body, headers } = await done;
      assert.equal(status, 402);
      assert.equal(body.x402Version, 1);
      assert.equal(headers['x-x402-version-served'], '1');
      const accept = body.accepts[0];
      // The three fields a v1 client reads and v2 had renamed out from under it.
      assert.equal(accept.maxAmountRequired, '3000');
      assert.equal(accept.network, 'base');
      assert.equal(typeof body.resource, 'string');
      assert.equal(body.resource, 'https://milliapi.com/api/audit-and-fix?url=https%3A%2F%2Fexample.com');
      assert.equal(accept.resource, body.resource);
      // Same money, same destination, same asset as the v2 challenge.
      assert.equal(accept.scheme, 'exact');
      assert.equal(accept.asset, USDC_BASE);
      assert.equal(accept.payTo, PAY_TO);
      assert.equal(accept.maxTimeoutSeconds, 300);
      assert.deepEqual(accept.extra, { name: 'USD Coin', version: '2' });
      assert.equal(accept.amount, undefined);
    });
  }

  it('keeps the MilliAPI offer readable on the v1 challenge', async () => {
    const { req, res, done } = context({ headers: { 'x402-version': '1' } });
    challenge(req, res, () => {});
    const { body } = await done;
    // v1 ignores fields it does not know, so a richer client still gets the preview and buyer flow.
    assert.equal(body.preview.available, true);
    assert.equal(body.purchase.retrySameRequest, true);
    assert.equal(body.extensions.milliapiOffer.priceUsd, 0.003);
    assert.deepEqual(body.x402VersionsSupported, [1, 2]);
  });

  it('encodes the negotiated body into the PAYMENT-REQUIRED header', async () => {
    const { req, res, done } = context({ headers: { 'x402-version': '1' } });
    challenge(req, res, () => {});
    const { body, headers } = await done;
    const decoded = JSON.parse(Buffer.from(headers['payment-required'], 'base64').toString('utf8'));
    assert.deepEqual(decoded, body);
  });

  it('falls back to v2 for an unsupported requested version', async () => {
    const { req, res, done } = context({ headers: { 'x402-version': '99' } });
    challenge(req, res, () => {});
    const { body, headers } = await done;
    assert.equal(body.x402Version, 2);
    assert.equal(headers['x-x402-version-served'], '2');
  });
});

describe('unpaid x402 challenge', () => {
  it('returns a 402 carrying x402 v2 exact USDC terms on Base', async () => {
    const { req, res, done } = context();
    challenge(req, res, () => {});
    const { status, body } = await done;
    assert.equal(status, 402);
    assert.equal(body.x402Version, 2);
    const accept = body.accepts[0];
    assert.equal(accept.scheme, 'exact');
    assert.equal(accept.network, 'eip155:8453');
    assert.equal(accept.asset, USDC_BASE);
    assert.equal(accept.payTo, PAY_TO);
    assert.equal(accept.amount, '3000');
  });

  it('prices the challenge in dollars consistently with the atomic amount', async () => {
    const { req, res, done } = context();
    challenge(req, res, () => {});
    const { body, headers } = await done;
    assert.equal(body.extensions.milliapiOffer.priceUsd, 0.003);
    assert.equal(headers['x-price-usd'], '0.003');
  });

  it('base64-encodes the same terms into the PAYMENT-REQUIRED header', async () => {
    const { req, res, done } = context();
    challenge(req, res, () => {});
    const { body, headers } = await done;
    const decoded = JSON.parse(Buffer.from(headers['payment-required'], 'base64').toString('utf8'));
    assert.deepEqual(decoded.accepts, body.accepts);
  });

  it('advertises same-request retry against a canonical public URL', async () => {
    const { req, res, done } = context();
    challenge(req, res, () => {});
    const { body } = await done;
    assert.equal(body.purchase.retrySameRequest, true);
    assert.equal(body.purchase.idempotency.supported, true);
    assert.equal(body.purchase.idempotency.header, 'Idempotency-Key');
    assert.ok(body.purchase.retryUrl.startsWith('https://milliapi.com/api/audit-and-fix'));
    assert.equal(body.purchase.accountRequired, false);
    assert.equal(body.purchase.apiKeyRequired, false);
  });

  it('never lets a preview or challenge imply spending authority', async () => {
    const { req, res, done } = context();
    challenge(req, res, () => {});
    const { body } = await done;
    assert.match(body.buyerFlow.spendControl, /wallet authorization/i);
    assert.match(body.buyerFlow.spendControl, /No preview, value proof, challenge, or next action authorizes payment/i);
  });

  it('strips preview from the paid URL and adds it to the preview URL', async () => {
    const { req, res, done } = context({ url: '/api/audit-and-fix?url=https%3A%2F%2Fexample.com&preview=1', query: { preview: '0' } });
    challenge(req, res, () => {});
    const { body } = await done;
    assert.ok(!body.purchase.retryUrl.includes('preview'));
    assert.ok(body.preview.url.includes('preview=1'));
  });

  it('serves a free preview instead of a challenge when preview=1 and no payment header', async () => {
    const { req, res, done } = context({ query: { preview: '1' } });
    challenge(req, res, () => {});
    const { status, body } = await done;
    assert.equal(status, 200);
    assert.equal(body.freePreview, true);
    assert.equal(body.priceUsd, 0.003);
  });

  it('passes a paid request through to the next handler rather than re-challenging', async () => {
    const { req, res } = context({ headers: { 'x-payment': 'signature' } });
    let passedThrough = false;
    await challenge(req, res, () => { passedThrough = true; });
    assert.equal(passedThrough, true);
  });

  it('normalizes X-PAYMENT-SIGNATURE onto the header the middleware reads', async () => {
    const { req, res } = context({ headers: { 'x-payment-signature': 'sig-abc' } });
    await challenge(req, res, () => {});
    assert.equal(req.headers['payment-signature'], 'sig-abc');
  });

  it('surfaces a live value proof when qualification supplied one', async () => {
    const proof = { evidenceType: 'live-site-qualification', actionableIssueCount: 4 };
    const { req, res, done } = context({ valueProof: proof, purchaseRecommended: true });
    challenge(req, res, () => {});
    const { body, headers } = await done;
    assert.deepEqual(body.valueProof, proof);
    assert.equal(body.purchaseRecommended, true);
    assert.equal(headers['x-purchase-recommended'], 'true');
    assert.equal(body.preview.kind, 'bounded-live-proof');
  });
});

describe('idempotent paid retry', () => {
  let middleware;
  beforeEach(() => { middleware = idempotencyMiddleware(); });

  function run(headers, query = { url: 'https://example.com' }) {
    const { req, res, done } = context({ headers, query });
    middleware(req, res, () => { res.status(200).json({ product: 'Audit + Fix', at: Math.random() }); });
    return done;
  }

  it('replays the stored paid result for a repeated key and identical request', async () => {
    const first = await run({ 'idempotency-key': 'buyer-key-0001', 'x-payment': 'sig' });
    const second = await run({ 'idempotency-key': 'buyer-key-0001', 'x-payment': 'sig' });
    assert.equal(first.headers['x-idempotent-replay'], 'false');
    assert.equal(second.headers['x-idempotent-replay'], 'true');
    assert.deepEqual(second.body, first.body);
  });

  it('treats a different request under the same key as a different purchase', async () => {
    const first = await run({ 'idempotency-key': 'buyer-key-0002', 'x-payment': 'sig' }, { url: 'https://a.example' });
    const second = await run({ 'idempotency-key': 'buyer-key-0002', 'x-payment': 'sig' }, { url: 'https://b.example' });
    assert.notDeepEqual(second.body, first.body);
    assert.equal(second.headers['x-idempotent-replay'], 'false');
  });

  it('falls back to the payment signature when no client key is supplied', async () => {
    const first = await run({ 'x-payment': 'sig-shared' });
    const second = await run({ 'x-payment': 'sig-shared' });
    assert.deepEqual(second.body, first.body);
  });

  it('does not replay for an unpaid request with no key', async () => {
    const first = await run({});
    const second = await run({});
    assert.notDeepEqual(second.body, first.body);
  });

  it('rejects a malformed key instead of ignoring it', async () => {
    const { status, body } = await run({ 'idempotency-key': 'short', 'x-payment': 'sig' });
    assert.equal(status, 400);
    assert.match(body.error, /8-200 characters/);
  });
});

describe('replay store', () => {
  it('reports the memory tier and its narrower scope when no shared store is configured', async () => {
    const { storeBackend, replayScope } = await import('../api/lib/replay-store.js');
    assert.equal(storeBackend(), 'in-process-memory');
    assert.match(replayScope(), /warm-runtime/);
  });

  it('loses a memory-only replay across a cold start, which is why the shared tier exists', async () => {
    const store = await import('../api/lib/replay-store.js');
    await store.writeReplay('cold-start-key', { status: 200, body: { n: 1 } }, 60_000);
    assert.deepEqual(await store.readReplay('cold-start-key'), { status: 200, body: { n: 1 } });

    store.__clearMemoryForTests();
    assert.equal(await store.readReplay('cold-start-key'), null);
  });

  it('expires an entry once its TTL has passed', async () => {
    const store = await import('../api/lib/replay-store.js');
    await store.writeReplay('short-ttl-key', { status: 200, body: { n: 2 } }, 1);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(await store.readReplay('short-ttl-key'), null);
  });

  it('promotes to the shared tier when the REST env vars are present', async () => {
    const store = await import('../api/lib/replay-store.js');
    process.env.IDEMPOTENCY_KV_REST_URL = 'https://kv.example.invalid';
    process.env.IDEMPOTENCY_KV_REST_TOKEN = 'token';
    try {
      assert.equal(store.storeBackend(), 'shared-rest-kv');
      assert.match(store.replayScope(), /shared-store/);
    } finally {
      delete process.env.IDEMPOTENCY_KV_REST_URL;
      delete process.env.IDEMPOTENCY_KV_REST_TOKEN;
    }
  });

  it('degrades to memory rather than failing the purchase when the shared store is unreachable', async () => {
    const store = await import('../api/lib/replay-store.js');
    process.env.IDEMPOTENCY_KV_REST_URL = 'https://kv.example.invalid';
    process.env.IDEMPOTENCY_KV_REST_TOKEN = 'token';
    try {
      await store.writeReplay('degraded-key', { status: 200, body: { n: 3 } }, 60_000);
      assert.deepEqual(await store.readReplay('degraded-key'), { status: 200, body: { n: 3 } });
    } finally {
      delete process.env.IDEMPOTENCY_KV_REST_URL;
      delete process.env.IDEMPOTENCY_KV_REST_TOKEN;
    }
  });
});
