import test from 'node:test';
import assert from 'node:assert/strict';
import { invoke } from './helpers.mjs';
import catalog from '../api/catalog.js';
import canon from '../api/church-402.js';
import pilgrimage from '../api/pilgrimage.js';

/**
 * Church402 sells nothing itself; its commercial job is handing agents to MilliAPI. That makes its
 * referral surface a dependency on a catalogue it does not own, and the two had already drifted:
 * the Canon and the pilgrimage both routed first-time buyers to a compatibility endpoint while the
 * current starter and flagship appeared in neither.
 *
 * These tests fail when they drift again, which matters most while the two are being separated.
 */

// The catalogue itself, and the free discovery routes it documents, are not products in it.
const NON_PRODUCT_PATHS = new Set(['/api/catalog']);

function endpointsIn(value, found = new Set()) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/https:\/\/milliapi\.com(\/api\/[a-z0-9-]+)/g)) {
      if (!NON_PRODUCT_PATHS.has(match[1])) found.add(match[1]);
    }
    return found;
  }
  if (Array.isArray(value)) { for (const item of value) endpointsIn(item, found); return found; }
  if (value && typeof value === 'object') { for (const item of Object.values(value)) endpointsIn(item, found); return found; }
  return found;
}

async function catalogueProducts() {
  const { body } = await invoke(catalog);
  const products = new Map();
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      if (typeof value.endpoint === 'string' && value.id) {
        const path = value.endpoint.replace('https://milliapi.com', '');
        products.set(path, { id:value.id, legacy:Boolean(value.legacyFlagship), priceUsd:value.priceUsd });
      }
      Object.values(value).forEach(walk);
    }
  };
  walk(body);
  return products;
}

test('every MilliAPI endpoint the Canon names still exists in the catalogue', async () => {
  const products = await catalogueProducts();
  const { body } = await invoke(canon);
  for (const path of endpointsIn(body)) {
    assert.ok(products.has(path), `the Canon routes agents to ${path}, which the MilliAPI catalogue no longer lists`);
  }
});

test('every MilliAPI endpoint the pilgrimage names still exists in the catalogue', async () => {
  const products = await catalogueProducts();
  const { body } = await invoke(pilgrimage, { query:{ url:'https://example.com' } });
  for (const path of endpointsIn(body)) {
    assert.ok(products.has(path), `the pilgrimage routes agents to ${path}, which the MilliAPI catalogue no longer lists`);
  }
});

test('the paid path a first-time buyer is sent down is not a compatibility route', async () => {
  const products = await catalogueProducts();
  const { body } = await invoke(pilgrimage, { query:{ url:'https://example.com' } });
  const readiness = body.selectedPilgrimage;
  assert.equal(readiness.id, 'site-readiness', 'a url goal should select the readiness pilgrimage');
  const firstPaidStep = readiness.steps.filter((step) => step.priceUsd > 0).sort((a, b) => a.order - b.order)[0];
  const path = String(firstPaidStep.endpoint).replace('https://milliapi.com', '').split('?')[0];

  assert.ok(products.has(path), `${path} is not in the catalogue`);
  assert.equal(products.get(path).legacy, false,
    `the pilgrimage sends first-time buyers to ${path}, which the catalogue marks as a compatibility route`);
});

test('the Canon offers the current starter and flagship, not only the compatibility route', async () => {
  const { body } = await invoke(canon);
  const named = endpointsIn(body);
  assert.ok(named.has('/api/audit-and-fix'), 'the Canon does not name the current MilliAPI starter');
  assert.ok(named.has('/api/repair-site'), 'the Canon does not name the current MilliAPI flagship');
});

test('a compatibility route is labelled as one wherever the Church still names it', async () => {
  const { body } = await invoke(canon);
  const rites = body.commerce?.lowCostRites || [];
  const legacy = rites.find((rite) => String(rite.endpoint).includes('/api/agent-web-audit'));
  if (legacy) {
    assert.match(String(legacy.note || ''), /compatibility/i,
      'the Church still names the compatibility route without saying that is what it is');
  }
});
