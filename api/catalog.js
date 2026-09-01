// api/catalog.js
// Free discovery surface for agents and developers.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const origin = 'https://money-finder-nu.vercel.app';
  return res.status(200).json({
    name: 'Money-Finder',
    description: 'Micropaid machine-readable utilities for AI agents.',
    protocol: 'x402',
    x402Version: 2,
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
      llms: `${origin}/llms.txt`
    },
    services: [
      {
        id: 'ai-web-readiness-audit',
        title: 'AI Web Readiness Audit',
        description: 'Audit a public HTTPS page for AI crawler access, robots.txt, llms.txt, canonical metadata, Open Graph, JSON-LD and basic machine-discovery readiness.',
        method: 'GET',
        endpoint: `${origin}/api/agent-web-audit`,
        priceUsd: 0.005,
        priceAtomicUsdc: '5000',
        input: {
          query: {
            url: {
              type: 'string',
              format: 'uri',
              required: true,
              constraints: 'Public HTTPS URL only'
            }
          },
          example: {
            url: 'https://example.com'
          }
        },
        output: {
          contentType: 'application/json',
          fields: ['score', 'page', 'discovery', 'aiCrawlerHomepageAccess', 'pricing']
        },
        tags: ['web', 'seo', 'ai-crawlers', 'llms.txt', 'robots.txt', 'metadata', 'structured-data']
      }
    ]
  });
}
