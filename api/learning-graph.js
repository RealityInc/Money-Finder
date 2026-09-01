// api/learning-graph.js
// Read-only, privacy-minimized view of Money-Finder's optimization graph.

import { getLearningGraph, rankRecommendations } from './lib/learning-graph.js';

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
