import { observePaidRoute, observePreviewRoute } from './privacy-traffic-telemetry.js';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PUBLIC_ORIGIN = 'https://milliapi.com';
const PAYMENT_HEADERS = ['PAYMENT-SIGNATURE', 'X-PAYMENT', 'X-PAYMENT-SIGNATURE'];
const FUNNEL_VERSION = 2;

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
  incoming.searchParams.delete('_vercel_share');
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

function buildOffer({req,route,amount,description,method,network,enriched,nextActions}) {
  const priceUsd=Number(amount)/1_000_000;
  const freePreviewUrl=canonicalRequestUrl(req,route,{preview:true});
  const paidUrl=canonicalRequestUrl(req,route);
  const discovery=discoveryDetails(enriched);
  const preview={
    available:true,
    url:freePreviewUrl,
    kind:'bounded-example',
    example:discovery?.output?.example || null,
    paidDelta:'Paid fulfillment performs the current task and returns the full route-specific result; the inline preview is bounded and non-transactional.',
  };
  const buyerFlow={
    funnelVersion:FUNNEL_VERSION,
    recommendedSequence:['inspect_inline_preview','fetch_free_preview_if_needed','retry_same_request_with_x402_payment'],
    spendControl:'Buyer or principal retains wallet authorization. No preview or challenge authorizes payment.',
  };
  return {
    version:1,
    funnelVersion:FUNNEL_VERSION,
    freePreviewUrl,
    paidUrl,
    method:String(method || 'GET').toUpperCase(),
    priceUsd,
    amountAtomic:String(amount),
    currency:'USDC',
    network:'Base',
    networkId:network,
    value:description,
    discovery,
    preview,
    buyerFlow,
    purchase:{
      retrySameRequest:true,
      instruction:'Review the inline or free preview, then retry the same request without preview=1 and attach a valid x402 payment header.',
      acceptedPaymentHeaders:PAYMENT_HEADERS,
      accountRequired:false,
      apiKeyRequired:false,
    },
    nextActions:Array.isArray(nextActions) ? nextActions : [],
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
  nextActions = [],
  asset = BASE_USDC,
  network = 'eip155:8453',
  mimeType = 'application/json',
}) {
  return async function fastChallengeMiddleware(req, res, next) {
    if (req.method !== method) return next();

    const enriched=enrichHttpDiscovery(extensions,method);
    const offer=buildOffer({req,route,amount,description,method,network,enriched,nextActions});

    if (!paymentHeader(req) && previewRequested(req)) {
      // Persist before returning because traditional response-finish callbacks can be
      // terminated by serverless runtimes before their asynchronous work completes.
      await observePreviewRoute(req,{route,amount:String(amount)});
      res.setHeader('Cache-Control','public, s-maxage=300');
      res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Free-Preview, Link');
      res.setHeader('X-Free-Preview',offer.freePreviewUrl);
      res.setHeader('Link',`<${offer.freePreviewUrl}>; rel="alternate"; type="application/json"; title="free-preview"`);
      return res.status(200).json({
        schemaVersion:1,
        funnelVersion:FUNNEL_VERSION,
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
        preview:offer.preview,
        buyerFlow:offer.buyerFlow,
        purchase:offer.purchase,
        nextActions:offer.nextActions,
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
        previewUrl:offer.freePreviewUrl,
      },
      preview:offer.preview,
      buyerFlow:offer.buyerFlow,
      nextActions:offer.nextActions,
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
    res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Free-Preview, Link');
    res.setHeader('X-Free-Preview',offer.freePreviewUrl);
    res.setHeader('Link',`<${offer.freePreviewUrl}>; rel="alternate"; type="application/json"; title="free-preview"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(402).json(paymentRequired);
  };
}
