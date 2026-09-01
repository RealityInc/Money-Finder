// api/learning-graph.js
// Read-only, privacy-minimized view of MilliAPI's optimization graph.

import { getLearningGraph, rankRecommendations } from './lib/learning-graph.js';

const ORIGIN = 'https://milliapi.com';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');

  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const graph = getLearningGraph();
  const recommendations = rankRecommendations(graph).slice(0, 8);

  return res.status(200).json({
    graph: graph.graph,
    version: graph.version,
    purpose: graph.purpose,
    guardrails: graph.guardrails,
    dashboard: `${ORIGIN}/learning.html`,
    livePracticeAudit: `${ORIGIN}/api/x402-practice-audit`,
    references: {
      protocol: 'https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md',
      bazaar: 'https://github.com/x402-foundation/x402/blob/main/docs/extensions/bazaar.mdx'
    },
    stats: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      practices: graph.nodes.filter(node => node.type === 'practice').length,
      services: graph.nodes.filter(node => node.type === 'service').length,
      buyerSegments: graph.nodes.filter(node => node.type === 'buyer').length
    },
    recommendations,
    nodes: graph.nodes,
    edges: graph.edges
  });
}
