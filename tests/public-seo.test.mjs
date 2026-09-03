import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);

test('public source files do not advertise Vercel deployment hosts in SEO metadata', () => {
  const files = execFileSync('git', [
    'ls-files',
    '*.html',
    '*.js',
    '*.json',
    '*.xml',
  ], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);

  const metadataPattern = /(?:rel=["']canonical["']|property=["']og:url["']|name=["']twitter:url["']|"@type"\s*:|"url"\s*:)[^>\n]*vercel\.app/i;
  for (const file of files) {
    const fileUrl = new URL(file, root);
    if (!existsSync(fileURLToPath(fileUrl))) continue;
    const source = readFileSync(fileUrl, 'utf8');
    assert.doesNotMatch(source, metadataPattern, `${file} contains a Vercel deployment URL in public metadata`);
  }
});

test('superseded x402 landing page redirects permanently to MilliAPI', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  for (const host of ['milliapi.com', 'www.milliapi.com']) {
    const redirect = config.redirects.find(rule =>
      rule.source === '/x402.html' &&
      rule.has?.some(item => item.type === 'host' && item.value === host)
    );
    assert.equal(redirect?.destination, 'https://milliapi.com/');
    assert.equal(redirect?.permanent, true);
  }
});
