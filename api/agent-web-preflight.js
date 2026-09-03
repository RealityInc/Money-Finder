import { preflightPublicUrl } from './lib/web-readiness-core.js';
import { observeFreeEvent } from './lib/privacy-traffic-telemetry.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const target = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!target) {
    await observeFreeEvent(req,{route:'/api/agent-web-preflight',stage:'free_explore',status:400,metadata:{variant:'preflight'}});
    return res.status(400).json({
      error: 'Missing url query parameter',
      example: '/api/agent-web-preflight?url=https%3A%2F%2Fexample.com'
    });
  }

  try {
    const result = await preflightPublicUrl(target);
    await observeFreeEvent(req,{route:'/api/agent-web-preflight',stage:'free_explore',status:200,metadata:{variant:'preflight',purchaseRecommended:Boolean(result?.purchaseRecommended)}});
    return res.status(200).json({
      ...result,
      paidAudit:{
        ...(result.paidAudit||{}),
        includes:['verdict','blockers','evidence','prioritized_fixes','crawler_policy','repair_artifacts','baseline_token'],
        postRepairVerification:{endpoint:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002}
      }
    });
  } catch (error) {
    await observeFreeEvent(req,{route:'/api/agent-web-preflight',stage:'free_explore',status:400,metadata:{variant:'preflight',failed:true}});
    const message = error?.name === 'AbortError' ? 'Target request timed out' : error?.message || 'Preflight failed';
    return res.status(400).json({ error: message });
  }
}
