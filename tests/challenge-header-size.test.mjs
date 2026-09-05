import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePaymentRequiredHeader, minimalPaymentRequired, PAYMENT_REQUIRED_HEADER_BUDGET_BYTES } from '../api/lib/x402-challenge-header.js';

/**
 * Node's fetch — what the reference x402 clients use — refuses a response whose headers exceed 16 KB
 * in total and reports a connection error rather than an HTTP one. A seller that trips this logs a
 * normal 402 while the buyer never sees a challenge at all, which in the funnel is indistinguishable
 * from a buyer choosing not to pay.
 *
 * This is not hypothetical. Machine Observer shipped a 15.7 KB PAYMENT-REQUIRED header, built by
 * base64-ing the whole enriched challenge body, and no organic purchase had ever completed.
 */

function enrichedChallenge(padding = 400) {
  const filler = 'x'.repeat(padding);
  return {
    x402Version:2,
    error:'Payment required',
    purchaseRecommended:true,
    valueProof:{ note:filler, evidence:Array.from({ length:12 }, () => filler) },
    preview:{ available:true, valueProof:{ note:filler } },
    buyerFlow:{ recommendedSequence:[filler, filler] },
    prePurchaseActions:[{ note:filler }],
    nextActions:[filler, filler],
    resource:{ url:'https://milliapi.com/api/audit-and-fix', description:filler, mimeType:'application/json', serviceName:'MilliAPI', tags:['x402'] },
    accepts:[{ scheme:'exact', network:'eip155:8453', amount:'3000', asset:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', payTo:'0x1111111111111111111111111111111111111111', maxTimeoutSeconds:300, extra:{ name:'USD Coin', version:'2' } }],
    extensions:{ bazaar:{ info:{ output:{ example:{ note:filler } } } } },
  };
}

test('a richly decorated challenge still produces a header a client will read', () => {
  const encoded = encodePaymentRequiredHeader(enrichedChallenge());
  assert.ok(encoded.length <= PAYMENT_REQUIRED_HEADER_BUDGET_BYTES,
    `the header is ${encoded.length} bytes; past the response budget Node's fetch reports a connection error and the buyer never sees the challenge`);
});

test('the offer body does not leak into the header', () => {
  const body = enrichedChallenge();
  const decoded = JSON.parse(Buffer.from(encodePaymentRequiredHeader(body), 'base64').toString('utf8'));
  assert.equal(decoded.valueProof, undefined);
  assert.equal(decoded.preview, undefined);
  assert.equal(decoded.extensions, undefined);
  assert.ok(JSON.stringify(decoded).length < JSON.stringify(body).length / 4,
    'the header should be a fraction of the body it was cut down from');
});

test('trimming never removes what a client needs to pay', () => {
  const body = enrichedChallenge();
  const decoded = JSON.parse(Buffer.from(encodePaymentRequiredHeader(body), 'base64').toString('utf8'));
  assert.equal(decoded.x402Version, body.x402Version);
  assert.deepEqual(decoded.accepts[0], body.accepts[0]);
  assert.equal(decoded.resource.url, body.resource.url);
});

test('an unusually long accepts list is reduced rather than emitted unreadable', () => {
  const body = enrichedChallenge();
  body.accepts = Array.from({ length:400 }, () => ({ ...body.accepts[0], extra:{ note:'y'.repeat(200) } }));
  const encoded = encodePaymentRequiredHeader(body);
  const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  assert.equal(decoded.accepts.length, 1, 'the cheapest payable option is kept');
  assert.ok(decoded.accepts[0].payTo, 'and it is still a usable payment option');
});

test('a v1 challenge keeps its string resource through trimming', () => {
  const v1 = { x402Version:1, error:'Payment required', resource:'https://milliapi.com/api/audit-and-fix',
    accepts:[{ scheme:'exact', network:'base', maxAmountRequired:'3000', resource:'https://milliapi.com/api/audit-and-fix', description:'d', mimeType:'application/json', payTo:'0x1', maxTimeoutSeconds:300, asset:'0x2' }],
    valueProof:{ note:'x'.repeat(5000) } };
  const decoded = minimalPaymentRequired(v1);
  assert.equal(decoded.x402Version, 1);
  assert.equal(typeof decoded.resource, 'string');
  assert.equal(decoded.valueProof, undefined);
});
