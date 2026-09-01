// api/lib/learning-graph.js
// A bounded, explainable learning graph for Money-Finder.
//
// The graph is deliberately conservative: it may rank product/discovery ideas,
// but it does not autonomously change wallets, payment recipients, auth, or
// settlement logic. Runtime payment outcomes are emitted as privacy-minimized
// observations and can be folded back into the graph by the optimizer.

export const GRAPH_VERSION = 1;

const NODES = [
  // Goals
  { id: 'goal:paid_calls', type: 'goal', label: 'More genuine paid x402 calls' },
  { id: 'goal:repeat_buyers', type: 'goal', label: 'More repeat machine buyers' },
  { id: 'goal:revenue', type: 'goal', label: 'Higher sustainable revenue' },
  { id: 'goal:reliability', type: 'goal', label: 'High payment-path reliability' },

  // Practices
  { id: 'practice:bazaar', type: 'practice', label: 'Rich Bazaar discovery metadata' },
  { id: 'practice:openapi', type: 'practice', label: 'Accurate OpenAPI contract' },
  { id: 'practice:llms_txt', type: 'practice', label: 'Clear llms.txt instructions' },
  { id: 'practice:catalog', type: 'practice', label: 'Free machine-readable catalog' },
  { id: 'practice:clear_price', type: 'practice', label: 'Explicit low-friction pricing' },
  { id: 'practice:narrow_tools', type: 'practice', label: 'Narrow deterministic micro-APIs' },
  { id: 'practice:cold_start', type: 'practice', label: 'Reduce facilitator cold-start failures' },
  { id: 'practice:privacy_min', type: 'practice', label: 'Minimize buyer telemetry' },

  // Discovery channels
  { id: 'channel:bazaar', type: 'channel', label: 'x402 Bazaar discovery' },
  { id: 'channel:llm', type: 'channel', label: 'LLM / agent discovery' },
  { id: 'channel:search', type: 'channel', label: 'Web search' },
  { id: 'channel:github', type: 'channel', label: 'Developer / GitHub discovery' },

  // Buyer segments
  { id: 'buyer:agent_developers', type: 'buyer', label: 'Agent developers' },
  { id: 'buyer:ai_search', type: 'buyer', label: 'AI-search / answer-engine optimizers' },
  { id: 'buyer:crawler_ops', type: 'buyer', label: 'Crawler and indexing operators' },
  { id: 'buyer:seo_tools', type: 'buyer', label: 'SEO and metadata automation tools' },

  // Products
  { id: 'service:ai_robots', type: 'service', label: 'AI Robots Policy Check', endpoint: '/api/ai-robots-check', priceUsd: 0.001 },
  { id: 'service:llms_txt', type: 'service', label: 'llms.txt Check', endpoint: '/api/llms-txt-check', priceUsd: 0.001 },
  { id: 'service:metadata', type: 'service', label: 'Page Metadata Extractor', endpoint: '/api/page-metadata', priceUsd: 0.002 },
  { id: 'service:web_audit', type: 'service', label: 'AI Web Readiness Audit', endpoint: '/api/agent-web-audit', priceUsd: 0.005 }
];

// weight: expected positive relationship, 0..1
// confidence: confidence in the relationship, 0..1
const EDGES = [
  { from: 'practice:bazaar', to: 'channel:bazaar', relation: 'improves_discovery', weight: 0.95, confidence: 0.95, evidence: 'x402 Bazaar extension is designed for facilitator resource discovery' },
  { from: 'practice:openapi', to: 'channel:llm', relation: 'improves_understanding', weight: 0.78, confidence: 0.75 },
  { from: 'practice:llms_txt', to: 'channel:llm', relation: 'improves_understanding', weight: 0.72, confidence: 0.65 },
  { from: 'practice:catalog', to: 'channel:llm', relation: 'improves_discovery', weight: 0.82, confidence: 0.8 },
  { from: 'practice:clear_price', to: 'goal:paid_calls', relation: 'reduces_friction', weight: 0.84, confidence: 0.72 },
  { from: 'practice:narrow_tools', to: 'goal:paid_calls', relation: 'improves_match', weight: 0.86, confidence: 0.74 },
  { from: 'practice:cold_start', to: 'goal:reliability', relation: 'improves_reliability', weight: 0.96, confidence: 0.92 },
  { from: 'practice:privacy_min', to: 'goal:repeat_buyers', relation: 'improves_trust', weight: 0.55, confidence: 0.55 },

  { from: 'channel:bazaar', to: 'goal:paid_calls', relation: 'acquires', weight: 0.9, confidence: 0.8 },
  { from: 'channel:llm', to: 'goal:paid_calls', relation: 'acquires', weight: 0.74, confidence: 0.58 },
  { from: 'channel:search', to: 'goal:paid_calls', relation: 'acquires', weight: 0.42, confidence: 0.45 },
  { from: 'channel:github', to: 'buyer:agent_developers', relation: 'reaches', weight: 0.68, confidence: 0.56 },

  { from: 'service:ai_robots', to: 'buyer:crawler_ops', relation: 'fits', weight: 0.9, confidence: 0.75 },
  { from: 'service:ai_robots', to: 'buyer:ai_search', relation: 'fits', weight: 0.88, confidence: 0.75 },
  { from: 'service:llms_txt', to: 'buyer:ai_search', relation: 'fits', weight: 0.94, confidence: 0.78 },
  { from: 'service:metadata', to: 'buyer:seo_tools', relation: 'fits', weight: 0.93, confidence: 0.8 },
  { from: 'service:web_audit', to: 'buyer:agent_developers', relation: 'fits', weight: 0.78, confidence: 0.62 },
  { from: 'service:web_audit', to: 'buyer:ai_search', relation: 'fits', weight: 0.9, confidence: 0.72 },

  { from: 'buyer:agent_developers', to: 'goal:repeat_buyers', relation: 'can_repeat', weight: 0.86, confidence: 0.62 },
  { from: 'buyer:ai_search', to: 'goal:repeat_buyers', relation: 'can_repeat', weight: 0.92, confidence: 0.7 },
  { from: 'buyer:crawler_ops', to: 'goal:repeat_buyers', relation: 'can_repeat', weight: 0.94, confidence: 0.72 },
  { from: 'buyer:seo_tools', to: 'goal:repeat_buyers', relation: 'can_repeat', weight: 0.9, confidence: 0.7 },

  { from: 'goal:paid_calls', to: 'goal:revenue', relation: 'drives', weight: 0.9, confidence: 0.9 },
  { from: 'goal:repeat_buyers', to: 'goal:revenue', relation: 'drives', weight: 0.98, confidence: 0.9 },
  { from: 'goal:reliability', to: 'goal:repeat_buyers', relation: 'supports', weight: 0.93, confidence: 0.88 }
];

const GUARDRAILS = [
  'Never change PAY_TO, wallet addresses, facilitator credentials, auth, or settlement rules automatically.',
  'Never fabricate buyer identity or infer sensitive attributes.',
  'Do not store raw IP addresses, payment credentials, wallet secrets, or request bodies as learning features.',
  'Protocol changes require an explicit code review; discovery copy, tags and product ranking may be optimized automatically.',
  'Price experiments must remain within configured bounds and must not make an already-authorized payment more expensive.'
];

export function getLearningGraph() {
  return {
    graph: 'money-finder-learning-graph',
    version: GRAPH_VERSION,
    updatedAt: '2026-09-01T04:00:00Z',
    purpose: 'Learn which x402 practices, products, discovery channels and buyer segments most strongly drive reliable paid usage.',
    guardrails: GUARDRAILS,
    nodes: NODES,
    edges: EDGES
  };
}

function bounded(value, min = 0.05, max = 0.99) {
  return Math.max(min, Math.min(max, value));
}

export function applyObservation(graph, observation) {
  const next = structuredClone(graph);
  const { from, to, success, strength = 1, note = null } = observation || {};
  const edge = next.edges.find(item => item.from === from && item.to === to);
  if (!edge || typeof success !== 'boolean') return next;

  // Small bounded update. Repeated evidence moves the graph gradually rather than
  // allowing one event to radically change strategy.
  const alpha = Math.max(0.01, Math.min(0.12, 0.04 * Number(strength || 1)));
  const target = success ? 1 : 0;
  edge.weight = Number(bounded(edge.weight + alpha * (target - edge.weight)).toFixed(4));
  edge.confidence = Number(bounded(edge.confidence + 0.025 * Number(strength || 1)).toFixed(4));
  edge.observations = (edge.observations || 0) + 1;
  if (note) edge.lastEvidence = String(note).slice(0, 240);
  return next;
}

export function rankRecommendations(graph = getLearningGraph()) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const candidates = graph.edges
    .filter(edge => edge.from.startsWith('practice:'))
    .map(edge => {
      const impact = edge.weight * edge.confidence;
      return {
        practiceId: edge.from,
        practice: byId.get(edge.from)?.label || edge.from,
        targetId: edge.to,
        target: byId.get(edge.to)?.label || edge.to,
        relation: edge.relation,
        score: Number(impact.toFixed(4)),
        confidence: edge.confidence,
        evidence: edge.lastEvidence || edge.evidence || null
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates;
}

export function learningEvent({ serviceId, priceUsd, network = 'eip155:8453', phase = 'settled' }) {
  return {
    event: 'money_finder.learning.payment',
    version: GRAPH_VERSION,
    phase,
    serviceId,
    priceUsd,
    network,
    occurredAt: new Date().toISOString()
  };
}

export function registerLearningHooks(resourceServer, { serviceId, priceUsd }) {
  if (!resourceServer?.onAfterSettle) return resourceServer;
  resourceServer.onAfterSettle(async context => {
    // Intentionally excludes IP, user-agent, wallet secret material and request payload.
    console.info('MONEY_FINDER_LEARNING_EVENT', JSON.stringify({
      ...learningEvent({ serviceId, priceUsd }),
      transaction: context?.result?.transaction || context?.result?.txHash || null,
      payer: null
    }));
  });
  return resourceServer;
}
