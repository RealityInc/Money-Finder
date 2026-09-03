import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRODUCTS, flagshipProduct, starterProduct } from '../api/lib/product-manifest.js';
import x402Discovery from '../api/x402-discovery.js';
import catalog from '../api/catalog.js';
import toolManifest from '../api/agent-tool-manifest.js';
import agentDiscovery from '../api/agent-discovery.js';
import { invoke } from './helpers.mjs';

const openapi = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));

describe('product manifest', () => {
  it('names exactly one starter and one flagship', () => {
    assert.equal(PRODUCTS.filter(product => product.role === 'starter').length, 1);
    assert.equal(PRODUCTS.filter(product => product.role === 'flagship').length, 1);
  });

  it('prices the starter below the flagship, so the cheapest useful buy is the advertised one', () => {
    assert.ok(starterProduct().priceUsd < flagshipProduct().priceUsd);
  });

  it('gives every product a unique id and path', () => {
    assert.equal(new Set(PRODUCTS.map(p => p.id)).size, PRODUCTS.length);
    assert.equal(new Set(PRODUCTS.map(p => p.path)).size, PRODUCTS.length);
  });

  it('documents every product in openapi.json', () => {
    for (const product of PRODUCTS) {
      assert.ok(openapi.paths[product.path], `${product.path} missing from openapi.json`);
    }
  });
});

describe('/.well-known/x402', () => {
  it('advertises the starter as the recommended first purchase at its manifest price', async () => {
    const { body } = await invoke(x402Discovery);
    assert.equal(body.starter.recommendedFirstPurchase, true);
    assert.equal(body.starter.priceUsd, starterProduct().priceUsd);
    assert.equal(body.flagship.priceUsd, flagshipProduct().priceUsd);
  });

  it('lists the starter ahead of the flagship in resources', async () => {
    const { body } = await invoke(x402Discovery);
    const starterAt = body.resources.findIndex(url => url.endsWith(starterProduct().path));
    const flagshipAt = body.resources.findIndex(url => url.endsWith(flagshipProduct().path));
    assert.ok(starterAt >= 0 && flagshipAt >= 0);
    assert.ok(starterAt < flagshipAt);
  });

  it('rejects non-GET', async () => {
    assert.equal((await invoke(x402Discovery, { method: 'POST' })).status, 405);
  });
});

describe('/api/catalog', () => {
  it('prices every service consistently with the product manifest', async () => {
    const { body } = await invoke(catalog);
    const byPath = new Map(PRODUCTS.map(product => [product.path, product]));
    let compared = 0;
    for (const service of body.services) {
      const path = new URL(service.endpoint).pathname;
      const product = byPath.get(path);
      assert.ok(product, `catalog lists ${path}, which is not in the product manifest`);
      assert.equal(service.priceUsd, product.priceUsd, `${service.id} price drifted from the manifest`);
      compared += 1;
    }
    assert.equal(compared, body.services.length);
    assert.ok(compared >= 8, 'expected the catalog to list every paid service');
  });

  it('names the starter as the recommended first purchase', async () => {
    const { body } = await invoke(catalog);
    assert.equal(body.startHere.recommendedFirstPurchase, starterProduct().id);
    assert.equal(body.buyerPrinciples.lowestUsefulPriceUsd, starterProduct().priceUsd);
  });

  it('offers a free preview on every paid service', async () => {
    const { body } = await invoke(catalog);
    for (const service of body.services) {
      assert.equal(service.preview.free, true, `${service.id} has no free preview`);
      assert.equal(service.preview.executesPaidWork, false);
    }
  });
});

describe('agent tool manifest', () => {
  it('exposes both current products as tools', async () => {
    const { body } = await invoke(toolManifest);
    const names = body.tools.map(tool => tool.name);
    assert.ok(names.includes('milliapi_audit_and_fix'));
    assert.ok(names.includes('milliapi_repair_site'));
  });

  it('only claims retry safety for tools that exist', async () => {
    const { body } = await invoke(toolManifest);
    const names = new Set(body.tools.map(tool => tool.name));
    for (const claimed of body.retrySafety.supportedTools) {
      assert.ok(names.has(claimed), `retrySafety names ${claimed}, which is not a published tool`);
    }
  });

  it('never marks payment unconditionally required', async () => {
    const { body } = await invoke(toolManifest);
    for (const tool of body.tools) {
      if (tool.payment.required !== false) assert.equal(tool.payment.required, 'conditional');
    }
  });

  it('reports the MCP adapter as shipped now that /api/mcp exists', async () => {
    const { body } = await invoke(toolManifest);
    assert.equal(body.adapters.mcp.status, 'shipped');
    assert.equal(body.adapters.mcp.quoteOnly, true);
  });
});

describe('agent manifest', () => {
  it('lists the starter capability with its price', async () => {
    const { body } = await invoke(agentDiscovery);
    const starter = body.capabilities.find(capability => capability.starter);
    assert.ok(starter, 'no capability marked as the starter');
    assert.equal(starter.priceUsd, starterProduct().priceUsd);
  });

  it('keeps the authority boundary explicit', async () => {
    const { body } = await invoke(agentDiscovery);
    assert.match(body.authorityBoundary, /wallet policy/i);
  });
});
