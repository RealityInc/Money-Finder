/**
 * x402 protocol version negotiation.
 *
 * MilliAPI serves x402 v2 challenges. v2 renamed and reshaped the fields a client needs in order to
 * construct a payment: `amount` replaced `maxAmountRequired`, `resource` became an object rather
 * than a URL string, and networks moved to CAIP-2 identifiers (`eip155:8453`) instead of names like
 * `base`. A client that only speaks v1 therefore receives a 402 body it cannot parse, and the only
 * thing it can do is give up — which is indistinguishable, in traffic logs, from a client that
 * inspected the offer and chose not to buy.
 *
 * So this module does two things: it serves a v1-shaped challenge to any client that asks for one,
 * and it records which version every challenge was served as, so the size of the v1 population
 * becomes a measurement rather than an assumption.
 */

export const SUPPORTED_X402_VERSIONS = Object.freeze([1, 2]);
export const DEFAULT_X402_VERSION = 2;

// v1 predates CAIP-2 identifiers and addresses chains by name.
const V1_NETWORK_NAMES = Object.freeze({
  'eip155:8453': 'base',
  'eip155:84532': 'base-sepolia',
  'eip155:1': 'ethereum',
});

export function v1NetworkName(caip2) {
  return V1_NETWORK_NAMES[caip2] || caip2;
}

const CAIP2_BY_V1_NAME = Object.freeze(
  Object.fromEntries(Object.entries(V1_NETWORK_NAMES).map(([caip2, name]) => [name, caip2])),
);

/**
 * Normalizes either naming convention to CAIP-2, so anything keyed by network treats a v1 `base` and
 * a v2 `eip155:8453` as the same chain. An unrecognized name is returned unchanged rather than
 * mapped to a guess.
 */
export function caip2Network(network) {
  const value = String(network || '').toLowerCase();
  return CAIP2_BY_V1_NAME[value] || value;
}

/**
 * Which protocol version this client asked for.
 *
 * v1 clients do not announce themselves, so the default stays v2 and v1 is served only on an
 * explicit request. `explicit` distinguishes "the client asked for this" from "the client said
 * nothing and got the default", which is the part worth logging.
 */
export function requestedX402Version(req) {
  const fromQuery = Array.isArray(req?.query?.x402Version) ? req.query.x402Version[0] : req?.query?.x402Version;
  const fromHeader = req?.get?.('x402-version') || req?.get?.('x-402-version');
  const accept = String(req?.get?.('accept') || '');

  const declared = fromQuery || fromHeader
    || (/vnd\.x402\.v1\+json/i.test(accept) ? '1' : null)
    || (/vnd\.x402\.v2\+json/i.test(accept) ? '2' : null);

  const parsed = Number(declared);
  if (SUPPORTED_X402_VERSIONS.includes(parsed)) return { version: parsed, explicit: true };
  return { version: DEFAULT_X402_VERSION, explicit: false, ...(declared ? { unsupportedRequest: String(declared) } : {}) };
}

/**
 * Rewrites a v2 payment-required body into its v1 equivalent.
 *
 * MilliAPI's own offer metadata (preview, value proof, buyer flow, offer extensions) rides along at
 * the top level. The v1 schema ignores fields it does not know rather than rejecting them, so a
 * strict v1 client still parses the challenge and a richer client can still read the extras.
 */
export function toV1PaymentRequired(v2Body, { resourceUrl, description, mimeType = 'application/json', outputSchema = null } = {}) {
  const accepts = (v2Body?.accepts || []).map((entry) => ({
    scheme: entry.scheme,
    network: v1NetworkName(entry.network),
    maxAmountRequired: String(entry.amount),
    resource: resourceUrl || v2Body?.resource?.url || '',
    description: description ?? v2Body?.resource?.description ?? '',
    mimeType: mimeType ?? v2Body?.resource?.mimeType ?? 'application/json',
    ...(outputSchema ? { outputSchema } : {}),
    payTo: entry.payTo,
    maxTimeoutSeconds: entry.maxTimeoutSeconds,
    asset: entry.asset,
    ...(entry.extra ? { extra: entry.extra } : {}),
  }));

  const { x402Version, accepts: _v2Accepts, resource: _v2Resource, ...passthrough } = v2Body || {};
  return {
    x402Version: 1,
    error: v2Body?.error || 'Payment required',
    accepts,
    ...passthrough,
    resource: resourceUrl || v2Body?.resource?.url || '',
    x402VersionsSupported: SUPPORTED_X402_VERSIONS,
  };
}

/** Advertises both versions so a client can request the one it understands. */
export function versionNegotiation(resourceUrl, served = DEFAULT_X402_VERSION) {
  return {
    served,
    supported: SUPPORTED_X402_VERSIONS,
    default: DEFAULT_X402_VERSION,
    requestV1: `${resourceUrl}${resourceUrl.includes('?') ? '&' : '?'}x402Version=1`,
    alsoAccepts: 'x402-version request header, or Accept: application/vnd.x402.v1+json',
    servedVersionHeader: 'X-X402-Version-Served',
    note: 'MilliAPI serves x402 v2 by default and v1 on request. Both challenges describe the same price, asset and destination.',
  };
}
