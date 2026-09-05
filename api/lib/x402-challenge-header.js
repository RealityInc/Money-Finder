/**
 * Portable payment-challenge header encoder.
 * Machine Observer is the reference implementation for this behavior.
 */

export const PAYMENT_REQUIRED_HEADER_BUDGET_BYTES = 6000;

export function minimalPaymentRequired(body) {
  if (!body || typeof body !== 'object') return body;
  const minimal = {
    x402Version: body.x402Version,
    error: body.error,
    accepts: body.accepts,
  };
  if (body.resource !== undefined) minimal.resource = body.resource;
  if (body.x402VersionsSupported) minimal.x402VersionsSupported = body.x402VersionsSupported;
  return minimal;
}

export function encodePaymentRequiredHeader(body, { budgetBytes = PAYMENT_REQUIRED_HEADER_BUDGET_BYTES } = {}) {
  const minimal = minimalPaymentRequired(body);
  const encoded = Buffer.from(JSON.stringify(minimal), 'utf8').toString('base64');
  if (encoded.length <= budgetBytes) return encoded;
  const trimmed = { ...minimal, accepts:(minimal.accepts || []).slice(0, 1) };
  return Buffer.from(JSON.stringify(trimmed), 'utf8').toString('base64');
}
