#!/usr/bin/env node
// Fails when a product in api/lib/product-manifest.js is missing from a surface
// that agents actually read. Discovery drift is a silent conversion bug: a SKU
// nobody can find is a SKU nobody buys.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PRODUCTS } from '../api/lib/product-manifest.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function renderHandler(modulePath) {
  return import(resolve(root, modulePath)).then(module => {
    let captured = null;
    const res = {
      setHeader() {},
      status() { return res; },
      json(body) { captured = body; return res; },
    };
    module.default({ method: 'GET', query: {}, headers: {} }, res);
    if (captured === null) throw new Error(`${modulePath} produced no JSON body`);
    return JSON.stringify(captured);
  });
}

function renderTextHandler(modulePath) {
  return import(resolve(root, modulePath)).then(module => {
    let captured = null;
    const res = {
      setHeader() {},
      status() { return res; },
      send(body) { captured = String(body ?? ''); return res; },
      end() { if (captured === null) captured = ''; return res; },
    };
    module.default({ method: 'GET', query: {}, headers: {} }, res);
    if (captured === null) throw new Error(`${modulePath} produced no text body`);
    return captured;
  });
}

function readText(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

const surfaces = {
  x402: { label: '.well-known/x402 (api/x402-discovery.js)', load: () => renderHandler('api/x402-discovery.js') },
  catalog: { label: '/api/catalog', load: () => renderHandler('api/catalog.js') },
  toolManifest: { label: '/api/agent-tool-manifest (MilliAPI)', load: () => renderHandler('api/milli-agent-tool-manifest.js') },
  agentManifest: { label: '/.well-known/agent.json (MilliAPI)', load: () => renderHandler('api/milli-agent-discovery.js') },
  llms: { label: 'milliapi.com/llms.txt', load: () => renderTextHandler('api/milli-llms.js') },
  skill: { label: 'milliapi.com/SKILL.md', load: () => renderTextHandler('api/milli-skill.js') },
  openapi: { label: 'openapi.json', load: async () => JSON.stringify(Object.keys(JSON.parse(readText('openapi.json')).paths)) },
};

const rendered = {};
for (const [key, surface] of Object.entries(surfaces)) {
  try {
    rendered[key] = await surface.load();
  } catch (error) {
    console.error(`Could not render surface "${key}" (${surface.label}): ${error.message}`);
    process.exit(2);
  }
}

const failures = [];
for (const product of PRODUCTS) {
  for (const key of product.surfaces) {
    if (!surfaces[key]) {
      failures.push(`${product.id}: unknown surface "${key}" in product manifest`);
      continue;
    }
    if (!rendered[key].includes(product.path)) {
      failures.push(`${product.id} (${product.path}) is missing from ${surfaces[key].label}`);
    }
  }
}

const checked = PRODUCTS.reduce((total, product) => total + product.surfaces.length, 0);

if (failures.length) {
  console.error(`\nDiscovery coverage FAILED — ${failures.length} of ${checked} product/surface pairs missing:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nAdd the product to the surface, or narrow its "surfaces" list in api/lib/product-manifest.js.\n');
  process.exit(1);
}

console.log(`Discovery coverage OK — ${PRODUCTS.length} products present across ${checked} product/surface pairs.`);
