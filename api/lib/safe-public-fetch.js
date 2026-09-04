// api/lib/safe-public-fetch.js
// Small SSRF-resistant fetch helper for public-web audit endpoints.

import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_REDIRECTS = 4;

function isBlockedIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIPv6(ip) {
  const value = ip.toLowerCase();
  return (
    value === '::' ||
    value === '::1' ||
    value.startsWith('::ffff:') ||
    (value === '100::' || value.startsWith('100::')) ||
    value.startsWith('2001:db8:') ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb') ||
    value.startsWith('ff')
  );
}

function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIPv4(ip);
  if (family === 6) return isBlockedIPv6(ip);
  return true;
}

async function assertPublicHostname(hostname) {
  // WHATWG URL keeps brackets around IPv6 hostnames; net.isIP expects the
  // address itself. Strip only that syntactic wrapper before classification.
  const normalized = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal')
  ) {
    throw new Error('Private or local hostnames are not allowed');
  }

  if (net.isIP(normalized)) {
    if (isBlockedIp(normalized)) throw new Error('Private or reserved IP addresses are not allowed');
    return;
  }

  const addresses = await dns.lookup(normalized, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Hostname did not resolve');
  if (addresses.some(({ address }) => isBlockedIp(address))) {
    throw new Error('Hostname resolves to a private or reserved IP address');
  }
}

export async function normalizePublicHttpsUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are allowed');
  if (url.username || url.password) throw new Error('Credentials in URLs are not allowed');
  if (url.port && url.port !== '443') throw new Error('Non-standard ports are not allowed');

  await assertPublicHostname(url.hostname);
  return url;
}

export async function safePublicFetch(input, options = {}) {
  const {
    maxBytes = 512_000,
    timeoutMs = 7000,
    headers = {},
    accept = 'text/html,text/plain,application/json;q=0.8,*/*;q=0.2'
  } = options;

  let current = await normalizePublicHttpsUrl(input);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept,
          'user-agent': 'MilliAPI-WebAudit/1.0 (+https://milliapi.com)',
          ...headers
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect response omitted Location header');
      if (redirectCount === MAX_REDIRECTS) throw new Error('Too many redirects');
      current = await normalizePublicHttpsUrl(new URL(location, current).toString());
      continue;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { response, text: '', finalUrl: current.toString() };
    }

    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Response exceeded ${maxBytes} byte limit`);
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {
      response,
      text: new TextDecoder('utf-8', { fatal: false }).decode(bytes),
      finalUrl: current.toString()
    };
  }

  throw new Error('Unexpected redirect state');
}
