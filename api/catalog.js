// api/catalog.js
// Free discovery surface for agents and developers.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const origin = 'https://money-finder-nu.vercel.app';
  const sharedInput = {
    query: {
      url: { type: 'string', format: 'uri', required: true, constraints: 'Public HTTPS URL only' }
    },
    example: { url: 'https://example.com' }
  };

  return res.status(200).json({
    name: 'Money-Finder',
    description: 'Micropaid machine-readable utilities for AI agents.',
    protocol: 'x402',
    x402Version: 2,
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
      learningGraph: `${origin}/api/learning-graph`
    },
    services: [
      {
        id: 'ai-robots-check',
        title: 'AI Robots Policy Check',
        description: 'Check robots.txt homepage permissions for major AI crawlers.',
        method: 'GET', endpoint: `${origin}/api/ai-robots-check`, priceUsd: 0.001, priceAtomicUsdc: '1000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['robotsTxt', 'aiCrawlerHomepageAccess', 'pricing'] },
        tags: ['robots.txt', 'ai-crawlers', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']
      },
      {
        id: 'llms-txt-check',
        title: 'llms.txt Check',
        description: 'Check whether a website publishes llms.txt and return status, size and a bounded preview.',
        method: 'GET', endpoint: `${origin}/api/llms-txt-check`, priceUsd: 0.001, priceAtomicUsdc: '1000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['llmsTxt', 'pricing'] },
        tags: ['llms.txt', 'ai-discovery', 'web']
      },
      {
        id: 'page-metadata',
        title: 'Page Metadata Extractor',
        description: 'Extract title, description, canonical URL, robots meta, Open Graph, H1 count and JSON-LD count.',
        method: 'GET', endpoint: `${origin}/api/page-metadata`, priceUsd: 0.002, priceAtomicUsdc: '2000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['title', 'description', 'canonical', 'metaRobots', 'openGraph', 'h1Count', 'jsonLdBlocks', 'pricing'] },
        tags: ['metadata', 'open-graph', 'canonical', 'json-ld', 'seo']
      },
      {
        id: 'ai-web-readiness-audit',
        title: 'AI Web Readiness Audit',
        description: 'Combined audit for AI crawler access, robots.txt, llms.txt, canonical metadata, Open Graph, JSON-LD and machine-discovery readiness.',
        method: 'GET', endpoint: `${origin}/api/agent-web-audit`, priceUsd: 0.005, priceAtomicUsdc: '5000',
        input: sharedInput,
        output: { contentType: 'application/json', fields: ['score', 'page', 'discovery', 'aiCrawlerHomepageAccess', 'pricing'] },
        tags: ['web', 'seo', 'ai-crawlers', 'llms.txt', 'robots.txt', 'metadata', 'structured-data']
      }
    ]
  });
}
