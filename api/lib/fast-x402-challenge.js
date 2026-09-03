import { observeFreeRoute, observePaidRoute } from './privacy-traffic-telemetry.js';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PUBLIC_ORIGIN = 'https://milliapi.com';
const PAYMENT_HEADERS = ['PAYMENT-SIGNATURE', 'X-PAYMENT', 'X-PAYMENT-SIGNATURE'];

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

function canonicalRequestUrl(req, route, { preview=false }={}) {
  const incoming=new URL(req.originalUrl || req.url || route, PUBLIC_ORIGIN);
  incoming.pathname=route;
  if (preview) incoming.searchParams.set('preview','1');
  else incoming.searchParams.delete('preview');
  return `${PUBLIC_ORIGIN}${incoming.pathname}${incoming.search}`;
}

function previewRequested(req) {
  const value=Array.isArray(req.query?.preview) ? req.query.preview[0] : req.query?.preview;
  return ['1','true','yes'].includes(String(value || '').toLowerCase());
}

function discoveryDetails(enriched) {
  const info=enriched?.bazaar?.info || {};
  return {
    input:info.input || null,
    output:info.output || null,
  };
}

function buildOffer({req,route,amount,description,method,network,enriched}) {
  const priceUsd=Number(amount)/1_000_000;
  return {
    version:1,
    freePreviewUrl:canonicalRequestUrl(req,route,{preview:true}),
    paidUrl:canonicalRequestUrl(req,route),
    method:String(method || 'GET').toUpperCase(),
    priceUsd,
    amountAtomic:String(amount),
    currency:'USDC',
    network:'Base',
    networkId:network,
    value:description,
    discovery:discoveryDetails(enriched),
    purchase:{
      retrySameRequest:true,
      instruction:'Review the free preview, then retry the same request without preview=1 and attach a valid x402 payment header.',
      acceptedPaymentHeaders:PAYMENT_HEADERS,
      accountRequired:false,
      apiKeyRequired:false,
    },
  };
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

    const enriched=enrichHttpDiscovery(extensions,method);
    const offer=buildOffer({req,route,amount,description,method,network,enriched});

    if (!paymentHeader(req) && previewRequested(req)) {
      observeFreeRoute(req,res,{route,stage:'preview'});
      res.setHeader('Cache-Control','public, s-maxage=300');
      return res.status(200).json({
        schemaVersion:1,
        freePreview:true,
        service:serviceName,
        route,
        method:String(method).toUpperCase(),
        value:description,
        priceUsd:offer.priceUsd,
        currency:'USDC',
        network:'Base',
        paidUrl:offer.paidUrl,
        discovery:offer.discovery,
        purchase:offer.purchase,
      });
    }

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
        url: offer.paidUrl,
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
      extensions: { ...enriched, milliapiOffer:offer },
    };

    const encoded = Buffer.from(JSON.stringify(paymentRequired), 'utf8').toString('base64');
    res.setHeader('PAYMENT-REQUIRED', encoded);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(402).json(paymentRequired);
  };
}
