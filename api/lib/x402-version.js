export const SUPPORTED_X402_VERSIONS = Object.freeze([1, 2]);
export const DEFAULT_X402_VERSION = 2;

const V1_NETWORK_NAMES = Object.freeze({
  'eip155:8453': 'base',
  'eip155:84532': 'base-sepolia',
  'eip155:1': 'ethereum',
});

export function v1NetworkName(caip2) {
  return V1_NETWORK_NAMES[caip2] || caip2;
}

function headerOf(request, name) {
  const headers = request?.headers;
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  if (typeof request.get === 'function') return request.get(name);
  return headers[name] ?? headers[String(name).toLowerCase()] ?? null;
}

export function requestedX402Version(request) {
  const url = (() => {
    try { return new URL(request.originalUrl || request.url || '', 'https://placeholder.invalid'); } catch { return null; }
  })();
  const fromQuery = url?.searchParams.get('x402Version');
  const fromHeader = headerOf(request, 'x402-version') || headerOf(request, 'x-402-version');
  const accept = String(headerOf(request, 'accept') || '');
  const declared = fromQuery || fromHeader
    || (/vnd\.x402\.v1\+json/i.test(accept) ? '1' : null)
    || (/vnd\.x402\.v2\+json/i.test(accept) ? '2' : null);
  const parsed = Number(declared);
  if (SUPPORTED_X402_VERSIONS.includes(parsed)) return { version:parsed, explicit:true };
  return { version:DEFAULT_X402_VERSION, explicit:false, ...(declared ? { unsupportedRequest:String(declared) } : {}) };
}

export function toV1PaymentRequired(v2Body, { resourceUrl, description, mimeType = 'application/json' } = {}) {
  const accepts = (v2Body?.accepts || []).map((entry) => ({
    scheme:entry.scheme,
    network:v1NetworkName(entry.network),
    maxAmountRequired:String(entry.amount),
    resource:resourceUrl || v2Body?.resource?.url || '',
    description:description ?? v2Body?.resource?.description ?? '',
    mimeType:mimeType ?? v2Body?.resource?.mimeType ?? 'application/json',
    payTo:entry.payTo,
    maxTimeoutSeconds:entry.maxTimeoutSeconds,
    asset:entry.asset,
    ...(entry.extra ? { extra:entry.extra } : {}),
  }));
  const { x402Version, accepts:_accepts, resource:_resource, ...passthrough } = v2Body || {};
  return {
    x402Version:1,
    error:v2Body?.error || 'Payment required',
    accepts,
    ...passthrough,
    resource:resourceUrl || v2Body?.resource?.url || '',
    x402VersionsSupported:SUPPORTED_X402_VERSIONS,
  };
}
