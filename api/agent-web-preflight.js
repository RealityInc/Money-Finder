import { preflightPublicUrl } from './lib/web-readiness-core.js';
import { observeFreeRoute } from './lib/privacy-traffic-telemetry.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // The private intelligence core accepts free_explore as the durable free-funnel
  // stage. Preserve the more specific meaning in privacy-safe metadata.
  observeFreeRoute(req,res,{route:'/api/agent-web-preflight',stage:'free_explore',metadata:{variant:'preflight'}});

  const target = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!target) {
    return res.status(400).json({
      error: 'Missing url query parameter',
      example: '/api/agent-web-preflight?url=https%3A%2F%2Fexample.com'
    });
  }

  try {
    const result = await preflightPublicUrl(target);
    return res.status(200).json({
      ...result,
      paidAudit:{
        ...(result.paidAudit||{}),
        includes:['verdict','blockers','evidence','prioritized_fixes','crawler_policy','repair_artifacts','baseline_token'],
        postRepairVerification:{endpoint:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002}
      }
    });
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Target request timed out' : error?.message || 'Preflight failed';
    return res.status(400).json({ error: message });
  }
}
