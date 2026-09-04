import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePublicHttpsUrl } from '../api/lib/safe-public-fetch.js';

const blocked = [
  'https://192.0.0.8/',
  'https://192.0.2.10/',
  'https://192.88.99.1/',
  'https://198.51.100.4/',
  'https://203.0.113.9/',
  'https://[::ffff:7f00:1]/',
  'https://[100::1]/',
  'https://[2001:db8::1]/',
];

test('rejects reserved and documentation-only IP literals', async () => {
  for (const url of blocked) {
    await assert.rejects(normalizePublicHttpsUrl(url), /private|reserved/i, url);
  }
});

test('accepts globally routable IPv4 and IPv6 literals', async () => {
  assert.equal((await normalizePublicHttpsUrl('https://1.1.1.1/')).hostname, '1.1.1.1');
  assert.equal(
    (await normalizePublicHttpsUrl('https://[2606:4700:4700::1111]/')).hostname,
    '[2606:4700:4700::1111]',
  );
});
