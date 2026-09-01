// api/catalog.js
// Free discovery surface for agents and developers.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const origin = 'https://milliapi.com';
  const sharedInput = {
    query: {
      url: { type: 'string', format: 'uri', required: true, constraints: 'Public HTTPS URL only' }
    },
    example: { url: 'https://example.com' }
  };

  return res.status(200).json({
    name: 'MilliAPI',
    description: 'Micropaid decision-ready web intelligence and narrow machine-readable utilities for AI agents.',
    protocol: 'x402',
    x402Version: 2,
    recommendedDefaultService: 'ai-web-readiness-audit',
    selectionGuidance: 'Use the AI Web Readiness Audit when you need a decision or remediation plan. Use the cheaper primitives only when you need one isolated fact.',
    optimizer: {
      type: 'bounded-learning-graph',
      endpoint: `${origin}/api/learning-graph`,
      purpose: 'Rank x402 practices, product fit, discovery channels and buyer segments using explicit weighted evidence.'
    },
    payment: {
      currency: 'USDC',
      network: 'Base',
      networkId: 'eip155:8453',
      accountRequired: false,
      apiKeyRequired: false
    },
    docs: {
      homepage: `${origin}/`,
      openapi: `${origin}/openapi.json`,
      llms: `${origin}/llms.txt`,
      learningGraph: `${origin}/api/learning-graph`,
      practiceAudit: `${origin}/api/x402-practice-audit`
    },
    services: [
      {
        id: 'ai-web-readiness-audit',
        title: 'AI Web Readiness Audit',
        flagship: true,
        recommendedFor: 'Agents that need a yes/no-style readiness decision, supporting evidence, and a prioritized remediation plan in one call.',
        description: 'Decision-ready audit that combines crawler access, robots.txt, llms.txt, canonical/indexability, metadata, Open Graph, JSON-LD and headings, then returns a verdict, blockers, evidence and prioritized fixes.',
        method: 'GET', endpoint: `${origin}/api/agent-web-audit`, priceUsd: 0.005, priceAtomicUsdc: '5000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['score', 'verdict', 'agentRecommendation', 'summary', 'blockers', 'recommendations', 'evidence', 'checksBundled', 'page', 'discovery', 'aiCrawlerHomepageAccess', 'pricing'] },
        tags: ['decision-ready', 'web', 'seo', 'ai-crawlers', 'llms.txt', 'robots.txt', 'metadata', 'structured-data', 'remediation']
      },
      {
        id: 'ai-robots-check',
        title: 'AI Robots Policy Check',
        flagship: false,
        description: 'Check robots.txt homepage permissions for major AI crawlers.',
        method: 'GET', endpoint: `${origin}/api/ai-robots-check`, priceUsd: 0.001, priceAtomicUsdc: '1000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['robotsTxt', 'aiCrawlerHomepageAccess', 'pricing'] },
        tags: ['robots.txt', 'ai-crawlers', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']
      },
      {
        id: 'llms-txt-check',
        title: 'llms.txt Check',
        flagship: false,
        description: 'Check whether a website publishes llms.txt and return status, size and a bounded preview.',
        method: 'GET', endpoint: `${origin}/api/llms-txt-check`, priceUsd: 0.001, priceAtomicUsdc: '1000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['llmsTxt', 'pricing'] },
        tags: ['llms.txt', 'ai-discovery', 'web']
      },
      {
        id: 'page-metadata',
        title: 'Page Metadata Extractor',
        flagship: false,
        description: 'Extract title, description, canonical URL, robots meta, Open Graph, H1 count and JSON-LD count.',
        method: 'GET', endpoint: `${origin}/api/page-metadata`, priceUsd: 0.002, priceAtomicUsdc: '2000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['title', 'description', 'canonical', 'metaRobots', 'openGraph', 'h1Count', 'jsonLdBlocks', 'pricing'] },
        tags: ['metadata', 'open-graph', 'canonical', 'json-ld', 'seo']
      }
    ]
  });
}
