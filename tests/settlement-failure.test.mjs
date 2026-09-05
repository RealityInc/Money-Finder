import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  classifySettlementFailure,
  guardSettlementFailure,
  settlementCapabilityLoaded,
  settlementFailureBody,
} from '../api/lib/x402-settlement-failure.js';

/**
 * What a buyer is told when it has already signed and the request then fails.
 *
 * This is the moment where a wrong answer costs the most. The x402 Express middleware answers a
 * facilitator it cannot reach with res.status(500).json({error:"Internal Server Error"}), which tells
 * a paying client nothing about whether its money moved; the rational client stops trying, and
 * MilliAPI's logs show only a 500. The rule locked in here is that "you were not charged" is only ever
 * said when it can be shown, and that a settled-but-undelivered payment is named rather than hidden.
 *
 * Ported from the Machine Observer baseline; see docs/payment-path-baseline.md there.
 */

process.env.PAY_TO ||= '0x1111111111111111111111111111111111111111';
process.env.CDP_API_KEY_ID ||= 'test-key-id';
process.env.CDP_API_KEY_SECRET ||= 'test-key-secret';

const NETWORK = 'eip155:8453';

// Stands in for the x402 resource server: after a failed initialize it knows no payment kinds.
const resourceServer = (loaded) => ({ getSupportedKind: () => (loaded ? { scheme:'exact', network:NETWORK } : undefined) });

test('a resource server with no payment kinds proves settlement was never attempted', () => {
  assert.equal(settlementCapabilityLoaded(resourceServer(false), { network:NETWORK }), false);
  assert.equal(settlementCapabilityLoaded(resourceServer(true), { network:NETWORK }), true);
  // Anything unrecognisable is unknown, never a guess in the buyer's favour.
  assert.equal(settlementCapabilityLoaded(null, { network:NETWORK }), null);
  assert.equal(settlementCapabilityLoaded({ getSupportedKind(){ throw new Error('boom'); } }, { network:NETWORK }), null);
});

test('an opaque server error is reported as unknown, never as not charged', () => {
  // The middleware returns this identical body whether the facilitator never loaded or the handler
  // died after settling. Reading "not charged" out of it would tell some buyers their money is safe
  // when it is gone.
  const { charged, reason } = classifySettlementFailure(new Error('Internal Server Error'));
  assert.equal(charged, null);
  assert.equal(reason, 'settlement_failed');
  assert.equal(settlementFailureBody(new Error('Internal Server Error')).status, 402);
});

test('a named transport failure is enough on its own', () => {
  for (const message of [
    'Failed to initialize: no supported payment kinds loaded from any facilitator.',
    'fetch failed',
    'connect ECONNREFUSED 127.0.0.1:443',
    'Invalid key format',
  ]) assert.equal(classifySettlementFailure(new Error(message)).charged, false, message);
});

test('evidence of settlement outranks an error message that looks like an outage', () => {
  // Otherwise a handler failing with "fetch failed" after the payment landed would be reported as a
  // free retry, and the buyer would pay a second time for something it already owns.
  const { charged, reason } = classifySettlementFailure(new Error('fetch failed'), { settled:true });
  assert.equal(charged, true);
  assert.equal(reason, 'settled_but_undelivered');
  assert.equal(settlementFailureBody(new Error('x'), { settled:true }).status, 502);
});

// The guard patches the Express response writer, so it is exercised through one.
function guarded({ payment, statusCode, payload, loaded, receipt }) {
  return new Promise((resolve) => {
    const req = { headers:payment ? { 'x-payment':'eyJib2d1cyI6dHJ1ZX0=' } : {} };
    const headers = {};
    let status = 200;
    const res = {
      statusCode:200,
      setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
      getHeader(name) { return headers[String(name).toLowerCase()]; },
      status(code) { status = code; res.statusCode = code; return res; },
      json(body) { resolve({ status, body, headers }); return res; },
    };
    if (receipt) res.setHeader('PAYMENT-RESPONSE', 'receipt');
    guardSettlementFailure(req, res, { resourceServer:resourceServer(loaded), network:NETWORK, route:'/api/audit-and-fix', priceUsd:0.003 });
    res.status(statusCode).json(payload);
  });
}

test('a signed payment against a facilitator that never loaded gets 503 and an explicit no-charge', async () => {
  const { status, body, headers } = await guarded({ payment:true, statusCode:500, payload:{ error:'Internal Server Error' }, loaded:false });
  assert.equal(status, 503);
  assert.equal(body.error, 'settlement_unavailable');
  assert.equal(body.charged, false);
  assert.equal(body.retryable, true);
  assert.equal(headers['x-charged'], 'false');
  assert.ok(headers['retry-after'], 'a retryable failure must say when to come back');
  assert.equal(body.priceUsd, 0.003, 'the buyer must be told what the retry costs');
});

test('a failure after the payment settled is named, not hidden', async () => {
  const { status, body } = await guarded({ payment:true, statusCode:500, payload:{ error:'audit failed' }, loaded:true, receipt:true });
  assert.equal(status, 502);
  assert.equal(body.error, 'settled_but_undelivered');
  assert.equal(body.charged, true);
  assert.match(body.buyerGuidance, /Do not pay again/i);
});

test('a successful paid response is left completely alone', async () => {
  const { status, body } = await guarded({ payment:true, statusCode:200, payload:{ product:'MilliAPI Audit + Fix' }, loaded:true });
  assert.equal(status, 200);
  assert.deepEqual(body, { product:'MilliAPI Audit + Fix' });
});

test('an unpaid caller keeps its own error', async () => {
  // Nothing was committed, so dressing its 500 up as a payment outcome would be a lie in the other
  // direction: it would tell a caller that never paid that it might have been charged.
  const { status, body } = await guarded({ payment:false, statusCode:500, payload:{ error:'Internal Server Error' }, loaded:false });
  assert.equal(status, 500);
  assert.deepEqual(body, { error:'Internal Server Error' });
});

/**
 * End to end through the real route, with the real middleware and deliberately fake credentials, so
 * the facilitator cannot initialize. This is the production failure being fixed.
 */
const PAID_ROUTES = [
  { module:'../api/audit-and-fix.js', path:'/api/audit-and-fix?url=https://example.com', priceUsd:0.003, endpoint:'https://milliapi.com/api/audit-and-fix' },
  { module:'../api/repair-site.js', path:'/api/repair-site?url=https://example.com', priceUsd:0.005, endpoint:'https://milliapi.com/api/repair-site' },
];

async function callPaid({ module, path }) {
  const app = (await import(module)).default;
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      headers:{ 'X-PAYMENT':'eyJib2d1cyI6dHJ1ZX0=', accept:'application/json' },
    });
    const body = await response.json().catch(() => null);
    return { response, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

for (const route of PAID_ROUTES) {
  test(`${route.module}: a presented payment never gets an unexplained server error`, async () => {
    const { response, body } = await callPaid(route);
    assert.notEqual(response.status, 500,
      `${route.module} answered a signed payment with a bare 500, which tells the buyer nothing about whether it was charged`);
    assert.ok(body && typeof body === 'object', 'a paid request must always answer with a readable body');

    // Whichever of the three outcomes this environment produces, the buyer must be able to read it.
    // Declining to charge before settlement is legitimate — the target is unreachable from here — but
    // it has to be stated, not implied by a 200 with no explanation.
    if (response.status === 200 && body.charged === false) {
      assert.ok(body.reason || body.error, 'declining to charge must name a reason');
      assert.equal(body.qualified, false);
      return;
    }
    if (response.status < 400) return;
    if (body.error === 'settlement_unavailable') {
      assert.equal(response.status, 503);
      assert.equal(body.charged, false);
      assert.equal(body.retryable, true);
      assert.equal(response.headers.get('x-charged'), 'false');
    }
  });

  test(`${route.module}: a declined preflight sends the buyer to this endpoint, at this price`, async () => {
    // Five routes share one preflight. It used to hardcode the legacy $0.005 audit as the paid product
    // for all of them, so a buyer that asked the $0.003 starter whether the target was worth auditing
    // was answered with a different endpoint's address and a price that is not what it would pay here.
    const { body } = await callPaid(route);
    const paidAudit = body?.valueProof?.paidAudit;
    if (!paidAudit) return; // The route got far enough to settle; there is no referral to check.
    assert.equal(paidAudit.endpoint, route.endpoint,
      `${route.module} pointed the buyer at ${paidAudit.endpoint} instead of itself`);
    assert.equal(paidAudit.priceUsd, route.priceUsd,
      `${route.module} quoted $${paidAudit.priceUsd} for a purchase that costs $${route.priceUsd}`);
  });
}
