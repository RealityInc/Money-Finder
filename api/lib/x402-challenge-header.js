/**
 * PORTABLE — copied from the Machine Observer baseline.
 *
 * Source of truth: Machine-Economy lib/x402-challenge-header.js.
 * Change it there first, then carry the change here.
 */

/**
 * Builds the PAYMENT-REQUIRED header value.
 *
 * The header used to carry a base64 copy of the entire challenge body. As the offer grew richer —
 * value proof, preview, buyer flow, discovery extensions — the header grew with it, and on the
 * history route it reached 15.7 KB against a 16 KB total header budget. Node's fetch, which is what
 * the reference x402 clients use, refuses a response whose headers exceed that and reports a
 * connection error. The seller logs a normal 402; the buyer never sees a challenge at all. In the
 * funnel that looks identical to a buyer choosing not to pay.
 *
 * The header therefore carries only what the protocol needs to construct a payment. Everything a
 * buyer might additionally want is already in the response body, which has no such limit.
 */

// Undici's default max header size is 16 KB for the whole response. This budget leaves room for the
// other headers a route sets, so no single one can push the response over on its own.
export const PAYMENT_REQUIRED_HEADER_BUDGET_BYTES = 6000;

export function minimalPaymentRequired(body) {
  if (!body || typeof body !== 'object') return body;
  const minimal = {
    x402Version:body.x402Version,
    error:body.error,
    accepts:body.accepts,
  };
  // v2 carries a resource object; v1 a URL string. Both are part of what a client needs.
  if (body.resource !== undefined) minimal.resource = body.resource;
  if (body.x402VersionsSupported) minimal.x402VersionsSupported = body.x402VersionsSupported;
  return minimal;
}

/**
 * Encodes a challenge for the header, dropping to the protocol essentials rather than truncating.
 * A truncated base64 payload is worse than a small one: it parses as garbage instead of failing
 * cleanly.
 */
export function encodePaymentRequiredHeader(body, { budgetBytes = PAYMENT_REQUIRED_HEADER_BUDGET_BYTES } = {}) {
  const minimal = minimalPaymentRequired(body);
  const encoded = Buffer.from(JSON.stringify(minimal), 'utf8').toString('base64');
  if (encoded.length <= budgetBytes) return encoded;
  // Even the essentials are too large, which means an unusually long accepts list. Keep the cheapest
  // payable option rather than emitting a header no client can read.
  const trimmed = { ...minimal, accepts:(minimal.accepts || []).slice(0, 1) };
  return Buffer.from(JSON.stringify(trimmed), 'utf8').toString('base64');
}
