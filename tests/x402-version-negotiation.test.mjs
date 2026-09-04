import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_X402_VERSION, requestedX402Version, toV1PaymentRequired, v1NetworkName, versionNegotiation } from '../api/lib/x402-version.js';
import { clientKind, isAutomatedDiscovery, uaFamily } from '../api/lib/client-classification.js';

// MilliAPI serves x402 from Node-style serverless handlers, so negotiation must read a plain
// headers object and a path-only url, not just a Web Request.
const nodeReq = (url, headers = {}) => ({ url, headers });

const V2_CHALLENGE = {
  x402Version:2,
  error:'Payment required',
  resource:{ url:'https://milliapi.com/api/audit-and-fix', description:'Audit and fix.', mimeType:'application/json', serviceName:'MilliAPI', tags:['x402'] },
  accepts:[{ scheme:'exact', network:'eip155:8453', amount:'5000', asset:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', payTo:'0x1111111111111111111111111111111111111111', maxTimeoutSeconds:300, extra:{ name:'USD Coin', version:'2' } }],
};

test('a v1 client can ask for a challenge it can parse', () => {
  assert.equal(requestedX402Version(nodeReq('/api/audit-and-fix?x402Version=1')).version, 1);
  assert.equal(requestedX402Version(nodeReq('/api/audit-and-fix', { 'x402-version':'1' })).version, 1);
  assert.equal(requestedX402Version(nodeReq('/api/audit-and-fix', { accept:'application/vnd.x402.v1+json' })).version, 1);
  assert.deepEqual(requestedX402Version(nodeReq('/api/audit-and-fix')), { version:DEFAULT_X402_VERSION, explicit:false },
    'a client that says nothing still gets v2');
});

test('the v1 rewrite describes the same payment in v1 field names', () => {
  const v1 = toV1PaymentRequired(V2_CHALLENGE, { resourceUrl:'https://milliapi.com/api/audit-and-fix', description:'Audit and fix.' });
  const [v1Accept] = v1.accepts;
  const [v2Accept] = V2_CHALLENGE.accepts;
  assert.equal(v1.x402Version, 1);
  assert.equal(v1Accept.maxAmountRequired, v2Accept.amount);
  assert.equal(v1Accept.payTo, v2Accept.payTo);
  assert.equal(v1Accept.asset, v2Accept.asset);
  assert.equal(v1Accept.network, 'base', 'v1 addresses chains by name');
  assert.equal(typeof v1.resource, 'string', 'v1 resource is a URL string');
  assert.equal(v1NetworkName('eip155:8453'), 'base');
});

test('MilliAPI offer metadata survives the v1 rewrite', () => {
  const withOffer = { ...V2_CHALLENGE, purchaseRecommended:true, preview:{ available:true } };
  const v1 = toV1PaymentRequired(withOffer, { resourceUrl:'https://milliapi.com/api/audit-and-fix' });
  assert.equal(v1.purchaseRecommended, true);
  assert.ok(v1.preview);
  assert.deepEqual(v1.x402VersionsSupported, [1, 2]);
});

test('both versions are advertised so a client can request what it speaks', () => {
  const negotiation = versionNegotiation('https://milliapi.com/api/audit-and-fix');
  assert.deepEqual(negotiation.supported, [1, 2]);
  assert.ok(negotiation.requestV1.includes('x402Version=1'));
});

test('an x402 mention in a user agent is not treated as a buyer', () => {
  assert.equal(clientKind('x402scan/1.0 (+https://x402scan.com)'), 'indexer');
  assert.equal(clientKind('UptimeRobot/2.0'), 'monitor');
  assert.equal(clientKind('x402-fetch/2.24.0'), 'unattributed',
    'a payment-capable-looking client is not a buyer until it presents a payment');
  assert.equal(clientKind('x402-fetch/2.24.0', true), 'buyer');
  assert.equal(uaFamily('x402-fetch/2.24.0'), 'x402-ua-mention');
  assert.equal(isAutomatedDiscovery(clientKind('x402scan/1.0')), true);
  assert.equal(isAutomatedDiscovery(clientKind('curl/8.4.0')), false);
});
