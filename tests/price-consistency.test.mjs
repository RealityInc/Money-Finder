import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { invoke } from './helpers.mjs';
import catalog from '../api/catalog.js';

const USDC_DECIMALS = 6;
const API_DIR = new URL('../api/', import.meta.url);

function routeAmount(name) {
  const source = readFileSync(new URL(`${name}.js`, API_DIR), 'utf8');
  const direct = source.match(/amount:\s*'?(\d+)'?/);
  if (direct) return direct[1];
  const viaConstant = source.match(/amount:\s*([A-Z_]+)/);
  if (!viaConstant) return null;
  const declared = source.match(new RegExp(`const ${viaConstant[1]}\\s*=\\s*'?(\\d+)'?`));
  return declared ? declared[1] : null;
}

async function catalogueProducts() {
  const { body } = await invoke(catalog);
  const products = [];
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      if (typeof value.endpoint === 'string' && typeof value.priceUsd === 'number' && value.priceUsd > 0) {
        const name = value.endpoint.replace(/^https:\/\/milliapi\.com\/api\//, '');
        if (!name.includes('/')) products.push({ id:value.id, name, priceUsd:value.priceUsd });
      }
      Object.values(value).forEach(walk);
    }
  };
  walk(body);
  return products;
}

test('the catalogue advertises paid products to check', async () => {
  const products = await catalogueProducts();
  assert.ok(products.length >= 5, `expected several paid products, found ${products.length}`);
});

test('every advertised price equals the amount its route charges', async () => {
  const products = await catalogueProducts();
  const checked = [];
  for (const product of products) {
    const amount = routeAmount(product.name);
    if (!amount) continue;
    const expected = String(Math.round(product.priceUsd * 10 ** USDC_DECIMALS));
    assert.equal(amount, expected,
      `${product.id} is advertised at $${product.priceUsd} but its route charges ${amount} atomic units (expected ${expected}); a buyer paying what the catalogue told it would be rejected`);
    checked.push(product.id);
  }
  assert.ok(checked.length >= 5, `only ${checked.length} products could be checked: ${checked.join(', ')}`);
});

test('no paid route charges an amount that is not a positive integer of atomic USDC units', () => {
  const routes = readdirSync(API_DIR).filter((file) => file.endsWith('.js'));
  for (const file of routes) {
    const name = file.replace(/\.js$/, '');
    const amount = routeAmount(name);
    if (!amount) continue;
    assert.match(amount, /^\d+$/, `${name} declares a non-integer atomic amount`);
    assert.ok(Number(amount) > 0, `${name} declares a zero or negative charge`);
  }
});
