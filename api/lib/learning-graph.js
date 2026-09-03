// api/lib/learning-graph.js
// Bounded, explainable optimization graph. Payment/security configuration is never mutated here.
import { bazaarResourceServerExtension } from '@x402/extensions/bazaar';

export const GRAPH_VERSION = 5;

const NODES = [
  { id:'goal:paid_calls',type:'goal',label:'More genuine paid x402 calls' },
  { id:'goal:repeat_buyers',type:'goal',label:'More repeat machine buyers' },
  { id:'goal:revenue',type:'goal',label:'Higher sustainable revenue' },
  { id:'goal:reliability',type:'goal',label:'High payment-path reliability' },
  { id:'practice:bazaar',type:'practice',label:'Rich Bazaar discovery metadata' },
  { id:'practice:openapi',type:'practice',label:'Accurate OpenAPI contract' },
  { id:'practice:llms_txt',type:'practice',label:'Clear llms.txt instructions' },
  { id:'practice:catalog',type:'practice',label:'Free machine-readable catalog' },
  { id:'practice:mcp_wrapper',type:'practice',label:'Expose flagship utility through an MCP payment wrapper' },
  { id:'practice:clear_price',type:'practice',label:'Explicit low-friction pricing' },
  { id:'practice:narrow_tools',type:'practice',label:'Narrow deterministic micro-APIs' },
  { id:'practice:cold_start',type:'practice',label:'Reduce facilitator cold-start failures' },
  { id:'practice:privacy_min',type:'practice',label:'Minimize buyer telemetry' },
  { id:'practice:preflight',type:'practice',label:'Free preflight before purchase' },
  { id:'practice:batch_value',type:'practice',label:'Batch multiple decisions into one purchase' },
  { id:'practice:portable_history',type:'practice',label:'Portable baseline and change detection' },
  { id:'practice:published_everywhere',type:'practice',label:'Every SKU named by every discovery surface' },
  { id:'practice:cheap_first_purchase',type:'practice',label:'A low-priced first purchase that is complete on its own' },
  { id:'practice:idempotent_retry',type:'practice',label:'Idempotent paid retry after a dropped connection' },
  { id:'channel:bazaar',type:'channel',label:'x402 Bazaar discovery' },
  { id:'channel:mcp',type:'channel',label:'MCP tool discovery and clients' },
  { id:'channel:llm',type:'channel',label:'LLM / agent discovery' },
  { id:'channel:search',type:'channel',label:'Web search' },
  { id:'channel:github',type:'channel',label:'Developer / GitHub discovery' },
  { id:'buyer:agent_developers',type:'buyer',label:'Agent developers' },
  { id:'buyer:mcp_builders',type:'buyer',label:'MCP tool builders and agent integrators' },
  { id:'buyer:ai_search',type:'buyer',label:'AI-search / answer-engine optimizers' },
  { id:'buyer:crawler_ops',type:'buyer',label:'Crawler and indexing operators' },
  { id:'buyer:seo_tools',type:'buyer',label:'SEO and metadata automation tools' },
  { id:'service:audit_and_fix',type:'service',label:'Audit + Fix',endpoint:'/api/audit-and-fix',priceUsd:0.003,role:'starter' },
  { id:'service:repair_site',type:'service',label:'Repair This Site',endpoint:'/api/repair-site',priceUsd:0.005,role:'flagship' },
  { id:'service:ai_robots',type:'service',label:'AI Robots Policy Check',endpoint:'/api/ai-robots-check',priceUsd:0.001 },
  { id:'service:llms_txt',type:'service',label:'llms.txt Check',endpoint:'/api/llms-txt-check',priceUsd:0.001 },
  { id:'service:metadata',type:'service',label:'Page Metadata Extractor',endpoint:'/api/page-metadata',priceUsd:0.002 },
  { id:'service:web_audit',type:'service',label:'AI Web Readiness Audit',endpoint:'/api/agent-web-audit',priceUsd:0.005 },
  { id:'service:web_audit_batch',type:'service',label:'AI Web Readiness Batch',endpoint:'/api/agent-web-audit-batch',priceUsd:0.02 },
  { id:'service:site_change',type:'service',label:'Site Readiness Change',endpoint:'/api/site-readiness-change',priceUsd:0.003 }
];

const EDGES = [
  {from:'practice:bazaar',to:'channel:bazaar',relation:'improves_discovery',weight:0.68,confidence:0.94,evidence:'Official x402 v2 guidance supports Bazaar metadata; current production settlements show Bazaar responses can reach processing, while upstream indexing remains imperfect.'},
  {from:'practice:openapi',to:'channel:llm',relation:'improves_understanding',weight:0.84,confidence:0.82,evidence:'Machine-readable contracts are facilitator-independent and production catalog/OpenAPI surfaces receive recurring requests.'},
  {from:'practice:llms_txt',to:'channel:llm',relation:'improves_understanding',weight:0.78,confidence:0.72},
  {from:'practice:catalog',to:'channel:llm',relation:'improves_discovery',weight:0.9,confidence:0.9,evidence:'The free catalog is one of the most-requested production discovery surfaces and exposes all services even when marketplace indexing is unreliable.'},
  {from:'practice:mcp_wrapper',to:'channel:mcp',relation:'opens_distribution',weight:0.9,confidence:0.88,evidence:'Official x402 guidance documents paid MCP tools and Bazaar discovery for MCP resources. MilliAPI now exposes /api/mcp; settlement deliberately stays in the buyer runtime.'},
  {from:'practice:clear_price',to:'goal:paid_calls',relation:'reduces_friction',weight:0.84,confidence:0.76,evidence:'Five settled production x402 events confirm buyers can complete the current explicit-price flow without account or API-key setup.'},
  {from:'practice:narrow_tools',to:'goal:paid_calls',relation:'improves_match',weight:0.88,confidence:0.82,evidence:'Settled production events occurred across all four core paid utilities; the combined web audit settled twice while each narrow utility settled once.'},
  {from:'practice:cold_start',to:'goal:reliability',relation:'improves_reliability',weight:0.97,confidence:0.96,evidence:'No runtime errors were observed on paid routes in the latest production window, but challenge and settlement reliability remains prerequisite infrastructure.'},
  {from:'practice:privacy_min',to:'goal:repeat_buyers',relation:'improves_trust',weight:0.58,confidence:0.6},
  {from:'practice:preflight',to:'goal:paid_calls',relation:'reduces_purchase_uncertainty',weight:0.76,confidence:0.7,evidence:'The free preflight is receiving production traffic and offers a low-risk way to qualify purchase intent before spend.'},
  {from:'practice:batch_value',to:'goal:paid_calls',relation:'improves_economics',weight:0.79,confidence:0.66,evidence:'One purchase replaces repeated calls for list-oriented workflows; production traffic exists but no settled batch event is yet observed.'},
  {from:'practice:portable_history',to:'goal:repeat_buyers',relation:'creates_repeat_value',weight:0.86,confidence:0.7,evidence:'Portable baselines make later change detection valuable without requiring an account; repeat-paid evidence is not yet established.'},
  {from:'practice:published_everywhere',to:'goal:paid_calls',relation:'removes_discovery_gap',weight:0.5,confidence:0.3,evidence:'DESIGN PRIOR, NOT OBSERVED. Three starter SKUs shipped 2026-09-03 were absent from every discovery surface until 2026-09-03; a buyer following published docs could not reach them. The defect is verified; the conversion lift is not yet measured. CI now enforces coverage via scripts/check-discovery-coverage.mjs.'},
  {from:'practice:cheap_first_purchase',to:'goal:paid_calls',relation:'reduces_first_purchase_risk',weight:0.5,confidence:0.3,evidence:'DESIGN PRIOR, NOT OBSERVED. Audit + Fix at $0.003 is now the advertised first purchase and is complete without a follow-on buy. No settled event yet distinguishes it from the $0.005 flagship.'},
  {from:'practice:idempotent_retry',to:'goal:repeat_buyers',relation:'improves_trust',weight:0.5,confidence:0.3,evidence:'DESIGN PRIOR, NOT OBSERVED. A dropped connection after settlement previously charged the buyer with no result and no safe retry. Idempotency-Key now covers every paid route. No double-charge has been observed either way.'},
  {from:'practice:mcp_wrapper',to:'goal:paid_calls',relation:'opens_distribution',weight:0.5,confidence:0.3,evidence:'DESIGN PRIOR, NOT OBSERVED. The MCP wrapper shipped 2026-09-03 at /api/mcp and is quote-only for paid products. No MCP-originated settlement has been observed.'},
  {from:'service:audit_and_fix',to:'buyer:agent_developers',relation:'fits',weight:0.5,confidence:0.3,evidence:'DESIGN PRIOR, NOT OBSERVED. Newly published; no settled events attributed to it yet.'},
  {from:'service:repair_site',to:'buyer:ai_search',relation:'fits',weight:0.5,confidence:0.3,evidence:'DESIGN PRIOR, NOT OBSERVED. Newly published to openapi.json and the tool manifest; no settled events attributed to it yet.'},
  {from:'channel:bazaar',to:'goal:paid_calls',relation:'acquires',weight:0.64,confidence:0.88},
  {from:'channel:mcp',to:'buyer:mcp_builders',relation:'reaches',weight:0.9,confidence:0.86,evidence:'Official x402 documentation provides a direct MCP integration and Bazaar-discovery path for paid tools.'},
  {from:'channel:mcp',to:'goal:paid_calls',relation:'acquires',weight:0.6,confidence:0.35,evidence:'MilliAPI shipped a quote-only MCP wrapper at /api/mcp on 2026-09-03. Product fit remains a hypothesis until an MCP-originated settlement is observed.'},
  {from:'channel:llm',to:'goal:paid_calls',relation:'acquires',weight:0.8,confidence:0.68},
  {from:'channel:search',to:'goal:paid_calls',relation:'acquires',weight:0.42,confidence:0.45},
  {from:'channel:github',to:'buyer:agent_developers',relation:'reaches',weight:0.72,confidence:0.6},
  {from:'service:ai_robots',to:'buyer:crawler_ops',relation:'fits',weight:0.9,confidence:0.77},
  {from:'service:ai_robots',to:'buyer:ai_search',relation:'fits',weight:0.88,confidence:0.77},
  {from:'service:llms_txt',to:'buyer:ai_search',relation:'fits',weight:0.94,confidence:0.8},
  {from:'service:metadata',to:'buyer:seo_tools',relation:'fits',weight:0.93,confidence:0.82},
  {from:'service:web_audit',to:'buyer:agent_developers',relation:'fits',weight:0.9,confidence:0.8,evidence:'The flagship audit has two settled production events in the latest observed window, the most among current services.'},
  {from:'service:web_audit',to:'buyer:mcp_builders',relation:'fits_tool_backend',weight:0.9,confidence:0.76,evidence:'Its single-input deterministic JSON contract maps cleanly to the MCP paid-tool pattern documented by x402.'},
  {from:'service:web_audit',to:'buyer:ai_search',relation:'fits',weight:0.94,confidence:0.82},
  {from:'service:web_audit_batch',to:'buyer:crawler_ops',relation:'fits',weight:0.92,confidence:0.72},
  {from:'service:web_audit_batch',to:'buyer:seo_tools',relation:'fits',weight:0.9,confidence:0.7},
  {from:'service:site_change',to:'buyer:agent_developers',relation:'fits_repeat_workflow',weight:0.88,confidence:0.7},
  {from:'service:site_change',to:'buyer:ai_search',relation:'fits_repeat_workflow',weight:0.9,confidence:0.72},
  {from:'buyer:agent_developers',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.86,confidence:0.64},
  {from:'buyer:mcp_builders',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.9,confidence:0.72,evidence:'MCP tool calls are naturally repeatable machine workflows; actual MilliAPI repeat-buyer evidence remains pending.'},
  {from:'buyer:ai_search',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.92,confidence:0.7},
  {from:'buyer:crawler_ops',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.94,confidence:0.72},
  {from:'buyer:seo_tools',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.9,confidence:0.7},
  {from:'goal:paid_calls',to:'goal:revenue',relation:'drives',weight:0.9,confidence:0.92,evidence:'Settled x402 events are now present in production, confirming the paid-call path can generate revenue.'},
  {from:'goal:repeat_buyers',to:'goal:revenue',relation:'drives',weight:0.98,confidence:0.9},
  {from:'goal:reliability',to:'goal:repeat_buyers',relation:'supports',weight:0.93,confidence:0.9}
];

const PROVENANCE={
  status:'hand-maintained',
  warning:'Weights and confidences in this graph are hand-entered design priors and small-sample readings, not computed statistics. Edges whose evidence begins "DESIGN PRIOR, NOT OBSERVED" have no supporting settlement data at all. Do not present any of it as a measured conversion rate.',
  measuredBy:null,
  blocker:'No funnel readback exists. The x402_funnel_v1 events emitted by api/lib/privacy-traffic-telemetry.js are written to the private intelligence core and never read back, so challenge-to-settlement conversion is unmeasured in this repository.',
  nextStep:'Add a readback that computes challenge -> settled and preview -> challenge per route, price and client family, then replace these hand-entered weights with observed values.',
};

const GUARDRAILS=[
  'Never change PAY_TO, wallet addresses, facilitator credentials, auth, settlement rules, payment networks, or payment protocol code automatically.',
  'Never fabricate buyer identity or infer sensitive attributes.',
  'Do not store raw IP addresses, payment credentials, wallet secrets, request bodies, or payer identity as learning features.',
  'Protocol changes require explicit review; discovery copy, tags and product ranking may be optimized automatically.',
  'Price experiments require explicit approval.',
  'Weights in this graph are hand-entered until a funnel readback exists. Never report them as measured conversion rates.'
];

export function getLearningGraph(){return {graph:'money-finder-learning-graph',version:GRAPH_VERSION,updatedAt:'2026-09-03T00:00:00Z',purpose:'Learn which x402 practices, products, discovery channels and buyer segments most strongly drive reliable paid usage.',provenance:PROVENANCE,guardrails:GUARDRAILS,nodes:NODES,edges:EDGES};}
function bounded(v,min=.05,max=.99){return Math.max(min,Math.min(max,v));}
export function applyObservation(graph,observation){const next=structuredClone(graph);const {from,to,success,strength=1,note=null}=observation||{};const edge=next.edges.find(x=>x.from===from&&x.to===to);if(!edge||typeof success!=='boolean')return next;const alpha=Math.max(.01,Math.min(.12,.04*Number(strength||1)));edge.weight=Number(bounded(edge.weight+alpha*((success?1:0)-edge.weight)).toFixed(4));edge.confidence=Number(bounded(edge.confidence+.025*Number(strength||1)).toFixed(4));edge.observations=(edge.observations||0)+1;if(note)edge.lastEvidence=String(note).slice(0,240);return next;}
export function rankRecommendations(graph=getLearningGraph()){const byId=new Map(graph.nodes.map(n=>[n.id,n]));return graph.edges.filter(e=>e.from.startsWith('practice:')).map(e=>({practiceId:e.from,practice:byId.get(e.from)?.label||e.from,targetId:e.to,target:byId.get(e.to)?.label||e.to,relation:e.relation,score:Number((e.weight*e.confidence).toFixed(4)),confidence:e.confidence,evidence:e.lastEvidence||e.evidence||null})).sort((a,b)=>b.score-a.score);}
export function learningEvent({serviceId,priceUsd,network='eip155:8453',phase='settled'}){return {event:'money_finder.learning.payment',version:GRAPH_VERSION,phase,serviceId,priceUsd,network,occurredAt:new Date().toISOString()};}
export function registerLearningHooks(resourceServer,{serviceId,priceUsd}){
  if(resourceServer?.registerExtension) resourceServer.registerExtension(bazaarResourceServerExtension);
  if(!resourceServer?.onAfterSettle)return resourceServer;
  resourceServer.onAfterSettle(async context=>{console.info('MONEY_FINDER_LEARNING_EVENT',JSON.stringify({...learningEvent({serviceId,priceUsd}),transaction:context?.result?.transaction||context?.result?.txHash||null,payer:null}));});
  return resourceServer;
}
