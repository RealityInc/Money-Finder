import { observePaidRoute, observePreviewRoute } from './privacy-traffic-telemetry.js';
import { requestedX402Version, toV1PaymentRequired, versionNegotiation } from './x402-version.js';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PUBLIC_ORIGIN = 'https://milliapi.com';
const PAYMENT_HEADERS = ['PAYMENT-SIGNATURE', 'X-PAYMENT', 'X-PAYMENT-SIGNATURE'];
const FUNNEL_VERSION = 3;
const IDEMPOTENCY = {
  header:'Idempotency-Key',
  supported:true,
  scope:'best-effort response replay; shared when the configured replay store is available',
  guidance:'Send an 8-200 character Idempotency-Key on the paid retry. Reuse the same key and exact request after a dropped connection to replay a successful result instead of paying again.',
};

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
  return { input:info.input || null, output:info.output || null };
}

function compactDiscovery(discovery, liveProof) {
  if (!liveProof) return discovery;
  return {
    input:discovery?.input || null,
    output:discovery?.output ? { type:discovery.output.type || 'json' } : null,
  };
}

function buildOffer({req,route,amount,description,method,network,enriched,nextActions,prePurchaseActions}) {
  const priceUsd=Number(amount)/1_000_000;
  const freePreviewUrl=canonicalRequestUrl(req,route,{preview:true});
  const paidUrl=canonicalRequestUrl(req,route);
  const discovery=discoveryDetails(enriched);
  const valueProof=req.x402ValueProof || null;
  const purchaseRecommended=typeof req.x402PurchaseRecommended === 'boolean' ? req.x402PurchaseRecommended : null;
  const preview={
    available:true,
    url:freePreviewUrl,
    kind:valueProof ? 'bounded-live-proof' : 'bounded-example',
    ...(valueProof ? { valueProof } : { example:discovery?.output?.example || null }),
    paidDelta:'Paid fulfillment performs the current task and returns the full route-specific result; the inline proof is bounded and non-transactional.',
  };
  const buyerFlow={
    funnelVersion:FUNNEL_VERSION,
    recommendedSequence:valueProof
      ? ['inspect_live_value_proof','retry_same_request_with_x402_payment']
      : ['inspect_inline_preview','retry_same_request_with_x402_payment'],
    spendControl:'Buyer or principal retains wallet authorization. No preview, value proof, challenge, or next action authorizes payment.',
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
    discovery:compactDiscovery(discovery,valueProof),
    preview,
    valueProof,
    purchaseRecommended,
    buyerFlow,
    prePurchaseActions:Array.isArray(prePurchaseActions) ? prePurchaseActions : [],
    purchase:{
      retrySameRequest:true,
      retryUrl:paidUrl,
      instruction:'If purchaseRecommended is true and expected utility exceeds price, retry purchase.retryUrl with a valid x402 payment header.',
      acceptedPaymentHeaders:PAYMENT_HEADERS,
      accountRequired:false,
      apiKeyRequired:false,
      idempotency:IDEMPOTENCY,
    },
    nextActions:Array.isArray(nextActions) ? nextActions : [],
  };
}

function setOfferHeaders(res, offer) {
  const exposed='PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Free-Preview, X-Paid-URL, X-Price-USD, X-Purchase-Recommended, X-Idempotent-Replay, X-Idempotency-Scope, Link';
  res.setHeader('Access-Control-Expose-Headers',exposed);
  res.setHeader('X-Free-Preview',offer.freePreviewUrl);
  res.setHeader('X-Paid-URL',offer.paidUrl);
  res.setHeader('X-Price-USD',String(offer.priceUsd));
  if (typeof offer.purchaseRecommended === 'boolean') res.setHeader('X-Purchase-Recommended',String(offer.purchaseRecommended));
  res.setHeader('Link',`<${offer.freePreviewUrl}>; rel="alternate"; type="application/json"; title="free-preview"`);
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
  prePurchaseActions = [],
  nextActions = [],
  asset = BASE_USDC,
  network = 'eip155:8453',
  mimeType = 'application/json',
}) {
  return async function fastChallengeMiddleware(req, res, next) {
    if (req.method !== method) return next();

    const enriched=enrichHttpDiscovery(extensions,method);
    const offer=buildOffer({req,route,amount,description,method,network,enriched,nextActions,prePurchaseActions});

    if (!paymentHeader(req) && previewRequested(req)) {
      await observePreviewRoute(req,{route,amount:String(amount),metadata:{funnelVersion:FUNNEL_VERSION,qualified:Boolean(offer.valueProof)}});
      res.setHeader('Cache-Control','public, s-maxage=300');
      setOfferHeaders(res,offer);
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
        purchaseRecommended:offer.purchaseRecommended,
        valueProof:offer.valueProof,
        discovery:offer.discovery,
        preview:offer.preview,
        buyerFlow:offer.buyerFlow,
        prePurchaseActions:offer.prePurchaseActions,
        purchase:offer.purchase,
        nextActions:offer.nextActions,
      });
    }

    await observePaidRoute(req, res, { route, method, amount: String(amount), metadata:{funnelVersion:FUNNEL_VERSION,qualified:Boolean(offer.valueProof),x402VersionServed:requestedX402Version(req).version,x402VersionExplicit:requestedX402Version(req).explicit} });
    if (paymentHeader(req)) {
      normalizePaymentHeader(req);
      return next();
    }

    // x402 v2 renamed the fields a client needs in order to pay, so a v1-only client cannot parse a v2
    // challenge and its only option is to leave. A v1 challenge is served on request, describing the
    // same price, asset and destination.
    const negotiated = requestedX402Version(req);
    const negotiation = { ...versionNegotiation(offer.paidUrl), served:negotiated.version };
    const v2Body = {
      x402Version: 2,
      error: 'Payment required',
      protocolVersions: negotiation,
      purchaseRecommended:offer.purchaseRecommended,
      valueProof:offer.valueProof,
      purchase:offer.purchase,
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
      prePurchaseActions:offer.prePurchaseActions,
      nextActions:offer.nextActions,
      accepts: [
        {
          scheme: 'exact',
          network,
          amount: String(amount),
          asset,
          payTo,
          maxTimeoutSeconds: 300,
          extra: { name: 'USD Coin', version: '2' },
        },
      ],
      extensions: { ...enriched, milliapiOffer:offer },
    };

    const paymentRequired = negotiated.version === 1
      ? toV1PaymentRequired(v2Body, { resourceUrl:offer.paidUrl, description, mimeType })
      : v2Body;

    const encoded = Buffer.from(JSON.stringify(paymentRequired), 'utf8').toString('base64');
    res.setHeader('PAYMENT-REQUIRED', encoded);
    res.setHeader('X-X402-Version-Served', String(negotiated.version));
    setOfferHeaders(res,offer);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(402).json(paymentRequired);
  };
}
