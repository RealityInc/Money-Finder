// api/agent-web-audit.js
// Paid AI web-readiness audit. x402 verifies and settles $0.005 USDC on Base
// before the audit handler runs.

import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { safePublicFetch, normalizePublicHttpsUrl } from './lib/safe-public-fetch.js';
import { registerLearningHooks } from './lib/learning-graph.js';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { buildReadinessAssessment } from './lib/readiness-assessment.js';

const NETWORK = 'eip155:8453';
const PRICE = '$0.005';
const ROUTE = '/api/agent-web-audit';
const PUBLIC_ORIGIN = 'https://milliapi.com';
const PAY_TO = process.env.PAY_TO || '';
const PAYMENT_CONFIGURED = Boolean(
  PAY_TO && process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET
);

const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'Google-Extended',
  'PerplexityBot',
  'Applebot-Extended'
];

const discoveryExtension = declareDiscoveryExtension({
  input: {
    url: 'https://example.com'
  },
  inputSchema: {
    properties: {
      url: {
        type: 'string',
        format: 'uri',
        description: 'Public HTTPS page to audit. Private IPs, localhost, credentials, and non-standard ports are rejected.'
      }
    },
    required: ['url']
  },
  output: {
    example: {
      product: 'MilliAPI AI Web Readiness Audit',
      target: 'https://example.com/',
      checkedAt: '2026-09-01T00:00:00.000Z',
      score: 45,
      verdict: 'needs_work',
      agentRecommendation: 'improve_before_prioritizing_discovery',
      summary: 'No blocking issue detected. Improvements are prioritized below.',
      blockers: [],
      recommendations: [
        { id: 'add_canonical', priority: 'high', issue: 'No canonical URL was detected.', action: 'Add a canonical link element.', evidence: 'canonical missing' }
      ],
      evidence: [],
      checksBundled: ['page_metadata', 'robots_txt', 'llms_txt', 'major_ai_crawler_homepage_access'],
      page: {
        title: 'Example Domain',
        description: null,
        canonical: null,
        noindex: false,
        h1Count: 1,
        jsonLdBlocks: 0,
        openGraph: {
          title: null,
          description: null,
          image: null,
          type: null
        }
      },
      discovery: {
        robotsTxt: { present: false, status: 404 },
        llmsTxt: { present: false, status: 404 }
      },
      aiCrawlerHomepageAccess: {
        GPTBot: { allowed: true, reason: 'No matching robots.txt group' }
      }
    },
    schema: {
      type: 'object',
      properties: {
        product: { type: 'string' },
        target: { type: 'string' },
        checkedAt: { type: 'string' },
        score: { type: 'number', minimum: 0, maximum: 100 },
        verdict: { type: 'string', enum: ['ready', 'mostly_ready', 'needs_work', 'blocked'] },
        agentRecommendation: { type: 'string' },
        summary: { type: 'string' },
        blockers: { type: 'array' },
        recommendations: { type: 'array' },
        evidence: { type: 'array' },
        checksBundled: { type: 'array' },
        page: { type: 'object' },
        discovery: { type: 'object' },
        aiCrawlerHomepageAccess: { type: 'object' },
        pricing: { type: 'object' }
      },
      required: ['product', 'target', 'checkedAt', 'score', 'verdict', 'agentRecommendation', 'summary', 'blockers', 'recommendations', 'evidence', 'checksBundled', 'page', 'discovery', 'aiCrawlerHomepageAccess']
    }
  }
});

function firstMatch(text, regex) {
  return text.match(regex)?.[1]?.trim() || null;
}

function decodeBasicEntities(value) {
  if (!value) return value;
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractMeta(html, key, attribute = 'name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`, 'i')
  ];
  for (const pattern of patterns) {
    const value = firstMatch(html, pattern);
    if (value) return decodeBasicEntities(value);
  }
  return null;
}

function extractLink(html, rel) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i')
  ];
  for (const pattern of patterns) {
    const value = firstMatch(html, pattern);
    if (value) return decodeBasicEntities(value);
  }
  return null;
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  let sawRule = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === 'user-agent') {
      if (!current || sawRule) {
        current = { agents: [], rules: [] };
        groups.push(current);
        sawRule = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      current.rules.push({ type: key, path: value });
      sawRule = true;
    }
  }

  return groups;
}

function botHomepageAccess(groups, bot) {
  const botName = bot.toLowerCase();
  const exact = groups.filter(group => group.agents.includes(botName));
  const applicable = exact.length ? exact : groups.filter(group => group.agents.includes('*'));
  if (!applicable.length) return { allowed: true, reason: 'No matching robots.txt group' };

  const rules = applicable.flatMap(group => group.rules).filter(rule => rule.path !== '');
  const matching = rules
    .filter(rule => '/'.startsWith(rule.path) || rule.path === '/')
    .sort((a, b) => b.path.length - a.path.length || (a.type === 'allow' ? -1 : 1));

  if (!matching.length) return { allowed: true, reason: 'No matching rule for homepage' };
  const winner = matching[0];
  return {
    allowed: winner.type === 'allow',
    reason: `${winner.type}: ${winner.path}`
  };
}

function parsePage(html, finalUrl) {
  const title = decodeBasicEntities(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = extractMeta(html, 'description');
  const robots = extractMeta(html, 'robots');
  const canonicalRaw = extractLink(html, 'canonical');
  let canonical = canonicalRaw;
  try {
    if (canonicalRaw) canonical = new URL(canonicalRaw, finalUrl).toString();
  } catch {}

  const jsonLdBlocks = (html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  const noindex = Boolean(robots && /(?:^|,)\s*noindex\b/i.test(robots));

  return {
    title,
    description,
    canonical,
    metaRobots: robots,
    noindex,
    h1Count,
    jsonLdBlocks,
    openGraph: {
      title: extractMeta(html, 'og:title', 'property'),
      description: extractMeta(html, 'og:description', 'property'),
      image: extractMeta(html, 'og:image', 'property'),
      type: extractMeta(html, 'og:type', 'property')
    }
  };
}

function scoreAudit({ page, robotsPresent, llmsPresent, crawlerAccess }) {
  let score = 0;
  const checks = [
    [Boolean(page.title), 15],
    [Boolean(page.description), 10],
    [Boolean(page.canonical), 10],
    [Boolean(page.openGraph.title), 10],
    [Boolean(page.openGraph.description), 5],
    [page.jsonLdBlocks > 0, 10],
    [page.h1Count > 0, 5],
    [!page.noindex, 10],
    [robotsPresent, 5],
    [llmsPresent, 5],
    [Object.values(crawlerAccess).some(item => item.allowed), 15]
  ];
  for (const [passed, points] of checks) if (passed) score += points;
  return score;
}

async function auditHandler(req, res) {
  const target = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!target) {
    return res.status(400).json({
      error: 'Missing url query parameter',
      example: '/api/agent-web-audit?url=https%3A%2F%2Fexample.com'
    });
  }

  try {
    const normalized = await normalizePublicHttpsUrl(target);
    const origin = normalized.origin;

    const [pageResult, robotsResult, llmsResult] = await Promise.allSettled([
      safePublicFetch(normalized.toString(), { maxBytes: 1_000_000 }),
      safePublicFetch(`${origin}/robots.txt`, { maxBytes: 256_000, accept: 'text/plain,*/*;q=0.2' }),
      safePublicFetch(`${origin}/llms.txt`, { maxBytes: 256_000, accept: 'text/plain,text/markdown,*/*;q=0.2' })
    ]);

    if (pageResult.status !== 'fulfilled') throw pageResult.reason;
    const pageFetch = pageResult.value;
    if (!pageFetch.response.ok) {
      return res.status(422).json({ error: `Target returned HTTP ${pageFetch.response.status}` });
    }

    const contentType = pageFetch.response.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return res.status(422).json({ error: `Target is not an HTML page (${contentType || 'unknown content type'})` });
    }

    const robotsPresent = robotsResult.status === 'fulfilled' && robotsResult.value.response.ok;
    const llmsPresent = llmsResult.status === 'fulfilled' && llmsResult.value.response.ok;
    const robotsText = robotsPresent ? robotsResult.value.text : '';
    const groups = parseRobots(robotsText);
    const crawlerAccess = Object.fromEntries(AI_BOTS.map(bot => [bot, botHomepageAccess(groups, bot)]));
    const page = parsePage(pageFetch.text, pageFetch.finalUrl);
    const score = scoreAudit({ page, robotsPresent, llmsPresent, crawlerAccess });
    const assessment = buildReadinessAssessment({
      score,
      page,
      robotsPresent,
      robotsStatus: robotsResult.status === 'fulfilled' ? robotsResult.value.response.status : null,
      llmsPresent,
      llmsStatus: llmsResult.status === 'fulfilled' ? llmsResult.value.response.status : null,
      crawlerAccess
    });

    return res.status(200).json({
      product: 'MilliAPI AI Web Readiness Audit',
      version: 2,
      target: pageFetch.finalUrl,
      checkedAt: new Date().toISOString(),
      score,
      ...assessment,
      page,
      discovery: {
        robotsTxt: {
          present: robotsPresent,
          status: robotsResult.status === 'fulfilled' ? robotsResult.value.response.status : null
        },
        llmsTxt: {
          present: llmsPresent,
          status: llmsResult.status === 'fulfilled' ? llmsResult.value.response.status : null,
          preview: llmsPresent ? llmsResult.value.text.slice(0, 500) : null
        }
      },
      aiCrawlerHomepageAccess: crawlerAccess,
      pricing: {
        protocol: 'x402',
        pricePerCallUsd: 0.005,
        currency: 'USDC',
        network: 'Base',
        paymentActive: true
      }
    });
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Target request timed out' : error?.message || 'Audit failed';
    return res.status(400).json({ error: message });
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT');
  res.setHeader('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE');
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

app.options(ROUTE, (_req, res) => res.status(204).end());

if (PAYMENT_CONFIGURED) {
  app.use(ROUTE, fastUnpaidChallenge({
    route: ROUTE,
    amount: 5000,
    payTo: PAY_TO,
    description: 'Decision-ready AI web audit in one paid call. Returns a readiness verdict, blocking issues, evidence, prioritized fixes, 0-100 score, crawler policy, robots.txt and llms.txt status, canonical/indexability, Open Graph, JSON-LD, headings, and major AI-crawler access.',
    serviceName: 'MilliAPI',
    tags: ['ai-agents', 'web-audit', 'ai-search', 'robots', 'llms-txt'],
    iconUrl: `${PUBLIC_ORIGIN}/icon.svg`,
    extensions: { ...discoveryExtension }
  }));
  const facilitator = createCdpFacilitatorClient();
  const resourceServer = registerLearningHooks(
    new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmScheme()),
    { serviceId: 'service:web_audit', priceUsd: 0.005 }
  );

  app.use(
    paymentMiddleware(
      {
        [`GET ${ROUTE}`]: {
          accepts: [
            {
              scheme: 'exact',
              price: PRICE,
              network: NETWORK,
              payTo: PAY_TO
            }
          ],
          resource: `${PUBLIC_ORIGIN}${ROUTE}`,
          description: 'Decision-ready AI web audit in one paid call. Returns a readiness verdict, blocking issues, evidence, prioritized fixes, 0-100 score, crawler policy, robots.txt and llms.txt status, canonical/indexability, Open Graph, JSON-LD, headings, and major AI-crawler access.',
          mimeType: 'application/json',
          serviceName: 'MilliAPI',
          tags: ['ai-agents', 'web-audit', 'ai-search', 'robots', 'llms-txt'],
          iconUrl: `${PUBLIC_ORIGIN}/icon.svg`,
          unpaidResponseBody: () => ({
            contentType: 'application/json',
            body: {
              error: 'payment_required',
              service: 'MilliAPI AI Web Readiness Audit',
              protocol: 'x402',
              priceUsd: 0.005,
              currency: 'USDC',
              network: 'Base',
              input: { url: 'https://example.com' },
              docs: `${PUBLIC_ORIGIN}/openapi.json`
            }
          }),
          extensions: {
            ...discoveryExtension
          }
        }
      },
      resourceServer,
      {
        appName: 'MilliAPI',
        appLogo: `${PUBLIC_ORIGIN}/icon.svg`,
        testnet: false
      }
    )
  );
} else {
  app.use(ROUTE, (req, res, next) => {
    if (req.method !== 'GET') return next();
    return res.status(503).json({
      error: 'x402 payment configuration incomplete',
      missing: [
        !PAY_TO ? 'PAY_TO' : null,
        !process.env.CDP_API_KEY_ID ? 'CDP_API_KEY_ID' : null,
        !process.env.CDP_API_KEY_SECRET ? 'CDP_API_KEY_SECRET' : null
      ].filter(Boolean)
    });
  });
}

app.get(ROUTE, auditHandler);
app.all(ROUTE, (_req, res) => res.status(405).json({ error: 'GET only' }));

export default app;
