// MilliAPI MCP endpoint.
//
// Free tools execute for real. Paid products are exposed as quotes only: this
// server never sends a payment header and never settles. Buyer wallet policy
// stays in the buyer runtime, which is the same boundary the catalog, the tool
// manifest and the Church canon all state.

import { createMcpEndpoint } from './lib/mcp-server.js';
import { PRODUCTS, flagshipProduct, starterProduct } from './lib/product-manifest.js';
import { auditPublicUrl, preflightPublicUrl } from './lib/web-readiness-core.js';

const ORIGIN = 'https://milliapi.com';
const PAYMENT_HEADERS = ['PAYMENT-SIGNATURE', 'X-PAYMENT', 'X-PAYMENT-SIGNATURE'];

const urlInput = {
  type: 'object',
  properties: {
    url: { type: 'string', format: 'uri', description: 'Public HTTPS page to inspect.' },
  },
  required: ['url'],
  additionalProperties: false,
};

const readOnly = { readOnlyHint: true, openWorldHint: true };

function quoteFor(product, params = {}) {
  const query = new URLSearchParams(params).toString();
  const paidUrl = `${ORIGIN}${product.path}${query ? `?${query}` : ''}`;
  return {
    schemaVersion: 1,
    charged: false,
    paymentAuthorized: false,
    product: { id: product.id, title: product.title, role: product.role },
    priceUsd: product.priceUsd,
    currency: 'USDC',
    network: 'Base',
    networkId: 'eip155:8453',
    settlementScheme: 'exact',
    method: product.method,
    paidUrl,
    previewUrl: `${paidUrl}${query ? '&' : '?'}preview=1`,
    acceptedPaymentHeaders: PAYMENT_HEADERS,
    accountRequired: false,
    apiKeyRequired: false,
    idempotency: product.idempotent
      ? { header: 'Idempotency-Key', supported: true, scope: 'best-effort warm-runtime response replay' }
      : { supported: false },
    howToBuy: [
      'Call paidUrl with no payment header. MilliAPI qualifies the live target first.',
      'A target that is unreachable, not HTML, or already clean returns a no-charge response instead of a challenge.',
      'When work exists the 402 carries a live valueProof, the exact paid unlocks, the price, and purchase.retryUrl.',
      'Retry that exact URL with an x402 payment header only if the buyer or principal authorizes the spend.',
    ],
    policy: {
      quoteIsAuthorization: false,
      buyerRetainsWalletControl: true,
      thisToolNeverSettles: true,
      authoritativeTerms: 'The live x402 challenge is authoritative if it differs from this quote.',
    },
  };
}

const tools = [
  {
    name: 'milliapi_web_signals',
    title: 'Free Agent Web Signals',
    description:
      'Free. Inspect a public page: title, description, canonical, noindex, heading and JSON-LD counts, Open Graph, robots.txt and llms.txt presence, and major AI-crawler homepage access. Returns no readiness verdict, score, prioritized fixes or repair artifacts — those are the paid delta.',
    inputSchema: urlInput,
    annotations: readOnly,
    run: async ({ url }) => {
      const result = await auditPublicUrl(url);
      return {
        free: true,
        product: 'MilliAPI Free Agent Web Signals',
        target: result.target,
        checkedAt: result.checkedAt,
        page: result.page,
        discovery: result.discovery,
        aiCrawlerHomepageAccess: result.aiCrawlerHomepageAccess,
        intentionallyWithheld: [
          'readiness_verdict',
          'score',
          'blockers',
          'prioritized_recommendations',
          'evidence',
          'repair_artifacts',
          'portable_baseline',
        ],
        paidNextAction: quoteFor(starterProduct(), { url: result.target }),
      };
    },
  },
  {
    name: 'milliapi_web_preflight',
    title: 'Free Readiness Preflight',
    description:
      'Free. Check whether a public page is reachable, is HTML, and has actionable AI/agent-readiness work, plus how many potential issues were seen. Use it to decide whether a paid audit is worth buying at all.',
    inputSchema: urlInput,
    annotations: readOnly,
    run: async ({ url }) => {
      const result = await preflightPublicUrl(url);
      return {
        free: true,
        ...result,
        interpretation: result.purchaseRecommended
          ? 'Actionable readiness work was detected. A paid audit will return a verdict, evidence and repair artifacts.'
          : 'No actionable readiness work was detected. MilliAPI will not issue a payment challenge for this target.',
        paidNextAction: result.purchaseRecommended ? quoteFor(starterProduct(), { url: result.target }) : null,
      };
    },
  },
  {
    name: 'milliapi_catalog',
    title: 'MilliAPI Product Catalog',
    description:
      'Free. List every MilliAPI product with its exact price, role (free, starter, flagship, legacy) and paid URL, cheapest useful product first. Nothing here authorizes payment.',
    inputSchema: {
      type: 'object',
      properties: {
        maxPriceUsd: { type: 'number', minimum: 0, description: 'Only list products at or below this price.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async ({ maxPriceUsd }) => {
      const cap = Number.isFinite(Number(maxPriceUsd)) ? Number(maxPriceUsd) : Infinity;
      const listed = PRODUCTS.filter(product => product.priceUsd <= cap).sort((a, b) => a.priceUsd - b.priceUsd);
      return {
        service: 'MilliAPI',
        charged: false,
        recommendedFirstPurchase: starterProduct()?.id ?? null,
        flagship: flagshipProduct()?.id ?? null,
        maxPriceUsd: cap === Infinity ? null : cap,
        products: listed.map(product => ({
          id: product.id,
          title: product.title,
          role: product.role,
          method: product.method,
          priceUsd: product.priceUsd,
          url: `${ORIGIN}${product.path}`,
          idempotent: product.idempotent,
        })),
        freeFirst: 'Inspect milliapi_web_signals before buying. Commodity observations are free; payment is concentrated on decision-ready repair outcomes.',
      };
    },
  },
  {
    name: 'milliapi_quote_repair',
    title: 'Quote a MilliAPI Repair Purchase',
    description:
      'Free and quote-only. Given a target URL, return the exact paid endpoint, price, retry mechanics and idempotency guidance for the cheapest product that solves the task. It never sends a payment header and never moves funds.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', description: 'Public HTTPS page the buyer wants repaired.' },
        needsVerificationBaseline: {
          type: 'boolean',
          description: 'Set true when the buyer also needs a portable baseline and a verification handoff, which selects the flagship instead of the cheaper starter.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async ({ url, needsVerificationBaseline }) => {
      const product = needsVerificationBaseline ? flagshipProduct() : starterProduct();
      return {
        ...quoteFor(product, { url }),
        why: needsVerificationBaseline
          ? 'Repair This Site was quoted because the task needs a portable baseline and a verification handoff.'
          : 'Audit + Fix was quoted because it is the cheapest product that already returns ready-to-apply repair artifacts.',
        alternative: quoteFor(needsVerificationBaseline ? starterProduct() : flagshipProduct(), { url }),
      };
    },
  },
];

export default createMcpEndpoint({
  serverName: 'MilliAPI',
  serverVersion: '1.0.0',
  instructions:
    'MilliAPI sells decision-ready website repair for autonomous software over x402. Free tools here execute immediately. Paid products are returned as quotes with their exact endpoint and price; this server never settles a payment, so the buyer runtime keeps wallet control. Start with milliapi_web_signals, and buy only when the live qualification shows actionable work.',
  tools,
});
