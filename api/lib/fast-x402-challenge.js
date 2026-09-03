import { observePaidRoute } from './privacy-traffic-telemetry.js';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function paymentHeader(req) {
  return req.get('PAYMENT-SIGNATURE') || req.get('X-PAYMENT') || req.get('X-PAYMENT-SIGNATURE') || null;
}

function normalizePaymentHeader(req) {
  if (!req.get('PAYMENT-SIGNATURE') && !req.get('X-PAYMENT') && req.get('X-PAYMENT-SIGNATURE')) {
    req.headers['payment-signature'] = req.get('X-PAYMENT-SIGNATURE');
  }
}

function enrichHttpDiscovery(extensions, method) {
  const enriched = JSON.parse(JSON.stringify(extensions || {}));
  const input = enriched?.bazaar?.info?.input;
  if (input?.type === 'http') input.method = String(method || 'GET').toUpperCase();
  return enriched;
}

export function fastUnpaidChallenge({
  route,
  amount,
  payTo,
  description,
  method = 'GET',
  serviceName = 'MilliAPI',
  tags = [],
  iconUrl = 'https://milliapi.com/icon.svg',
  extensions = {},
  asset = BASE_USDC,
  network = 'eip155:8453',
  mimeType = 'application/json',
}) {
  return async function fastChallengeMiddleware(req, res, next) {
    if (req.method !== method) return next();

    // The persistence call is bounded to 500 ms inside observePaidRoute. This keeps
    // the challenge path responsive while making the private learning feed durable.
    await observePaidRoute(req, res, { route, method, amount: String(amount) });
    if (paymentHeader(req)) {
      normalizePaymentHeader(req);
      return next();
    }

    const paymentRequired = {
      x402Version: 2,
      error: 'Payment required',
      resource: {
        url: `https://milliapi.com${route}`,
        description,
        mimeType,
        serviceName,
        tags,
        iconUrl,
      },
      accepts: [
        {
          scheme: 'exact',
          network,
          amount: String(amount),
          asset,
          payTo,
          maxTimeoutSeconds: 300,
          extra: {
            name: 'USD Coin',
            version: '2',
          },
        },
      ],
      extensions: enrichHttpDiscovery(extensions, method),
    };

    const encoded = Buffer.from(JSON.stringify(paymentRequired), 'utf8').toString('base64');
    res.setHeader('PAYMENT-REQUIRED', encoded);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(402).json(paymentRequired);
  };
}
