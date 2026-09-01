// Free x402 discovery fan-out for crawlers and registries such as x402scan.
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  return res.status(200).json({
    version: 1,
    resources: [
      'https://milliapi.com/api/ai-robots-check',
      'https://milliapi.com/api/llms-txt-check',
      'https://milliapi.com/api/page-metadata',
      'https://milliapi.com/api/agent-web-audit'
    ],
    instructions: 'See https://milliapi.com/openapi.json and https://milliapi.com/api/catalog for schemas, prices, and examples.'
  });
}
