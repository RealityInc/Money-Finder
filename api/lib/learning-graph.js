// api/lib/learning-graph.js
// Bounded, explainable optimization graph. Payment/security configuration is never mutated here.
import { bazaarResourceServerExtension } from '@x402/extensions/bazaar';

export const GRAPH_VERSION = 3;

const NODES = [
  { id:'goal:paid_calls',type:'goal',label:'More genuine paid x402 calls' },
  { id:'goal:repeat_buyers',type:'goal',label:'More repeat machine buyers' },
  { id:'goal:revenue',type:'goal',label:'Higher sustainable revenue' },
  { id:'goal:reliability',type:'goal',label:'High payment-path reliability' },
  { id:'practice:bazaar',type:'practice',label:'Rich Bazaar discovery metadata' },
  { id:'practice:openapi',type:'practice',label:'Accurate OpenAPI contract' },
  { id:'practice:llms_txt',type:'practice',label:'Clear llms.txt instructions' },
  { id:'practice:catalog',type:'practice',label:'Free machine-readable catalog' },
  { id:'practice:clear_price',type:'practice',label:'Explicit low-friction pricing' },
  { id:'practice:narrow_tools',type:'practice',label:'Narrow deterministic micro-APIs' },
  { id:'practice:cold_start',type:'practice',label:'Reduce facilitator cold-start failures' },
  { id:'practice:privacy_min',type:'practice',label:'Minimize buyer telemetry' },
  { id:'practice:preflight',type:'practice',label:'Free preflight before purchase' },
  { id:'practice:batch_value',type:'practice',label:'Batch multiple decisions into one purchase' },
  { id:'practice:portable_history',type:'practice',label:'Portable baseline and change detection' },
  { id:'channel:bazaar',type:'channel',label:'x402 Bazaar discovery' },
  { id:'channel:llm',type:'channel',label:'LLM / agent discovery' },
  { id:'channel:search',type:'channel',label:'Web search' },
  { id:'channel:github',type:'channel',label:'Developer / GitHub discovery' },
  { id:'buyer:agent_developers',type:'buyer',label:'Agent developers' },
  { id:'buyer:ai_search',type:'buyer',label:'AI-search / answer-engine optimizers' },
  { id:'buyer:crawler_ops',type:'buyer',label:'Crawler and indexing operators' },
  { id:'buyer:seo_tools',type:'buyer',label:'SEO and metadata automation tools' },
  { id:'service:ai_robots',type:'service',label:'AI Robots Policy Check',endpoint:'/api/ai-robots-check',priceUsd:0.001 },
  { id:'service:llms_txt',type:'service',label:'llms.txt Check',endpoint:'/api/llms-txt-check',priceUsd:0.001 },
  { id:'service:metadata',type:'service',label:'Page Metadata Extractor',endpoint:'/api/page-metadata',priceUsd:0.002 },
  { id:'service:web_audit',type:'service',label:'AI Web Readiness Audit',endpoint:'/api/agent-web-audit',priceUsd:0.005 },
  { id:'service:web_audit_batch',type:'service',label:'AI Web Readiness Batch',endpoint:'/api/agent-web-audit-batch',priceUsd:0.02 },
  { id:'service:site_change',type:'service',label:'Site Readiness Change',endpoint:'/api/site-readiness-change',priceUsd:0.003 }
];

const EDGES = [
  {from:'practice:bazaar',to:'channel:bazaar',relation:'improves_discovery',weight:0.68,confidence:0.92,evidence:'Official x402 guidance supports Bazaar metadata, but facilitator indexing may lag.'},
  {from:'practice:openapi',to:'channel:llm',relation:'improves_understanding',weight:0.82,confidence:0.78,evidence:'Direct machine-readable contracts remain facilitator-independent.'},
  {from:'practice:llms_txt',to:'channel:llm',relation:'improves_understanding',weight:0.76,confidence:0.68},
  {from:'practice:catalog',to:'channel:llm',relation:'improves_discovery',weight:0.88,confidence:0.84,evidence:'Direct catalog exposes all services even when marketplace indexing is unreliable.'},
  {from:'practice:clear_price',to:'goal:paid_calls',relation:'reduces_friction',weight:0.84,confidence:0.72},
  {from:'practice:narrow_tools',to:'goal:paid_calls',relation:'improves_match',weight:0.86,confidence:0.74},
  {from:'practice:cold_start',to:'goal:reliability',relation:'improves_reliability',weight:0.97,confidence:0.94,evidence:'Reliable challenge and settlement paths are prerequisites for repeat buying.'},
  {from:'practice:privacy_min',to:'goal:repeat_buyers',relation:'improves_trust',weight:0.55,confidence:0.55},
  {from:'practice:preflight',to:'goal:paid_calls',relation:'reduces_purchase_uncertainty',weight:0.74,confidence:0.62,evidence:'A free bounded preflight lets an agent estimate whether a paid decision is useful before authorizing spend.'},
  {from:'practice:batch_value',to:'goal:paid_calls',relation:'improves_economics',weight:0.79,confidence:0.64,evidence:'One purchase replaces repeated calls for list-oriented workflows.'},
  {from:'practice:portable_history',to:'goal:repeat_buyers',relation:'creates_repeat_value',weight:0.86,confidence:0.68,evidence:'Portable baselines make later change detection valuable without requiring an account.'},
  {from:'channel:bazaar',to:'goal:paid_calls',relation:'acquires',weight:0.62,confidence:0.86},
  {from:'channel:llm',to:'goal:paid_calls',relation:'acquires',weight:0.78,confidence:0.62},
  {from:'channel:search',to:'goal:paid_calls',relation:'acquires',weight:0.42,confidence:0.45},
  {from:'channel:github',to:'buyer:agent_developers',relation:'reaches',weight:0.72,confidence:0.6},
  {from:'service:ai_robots',to:'buyer:crawler_ops',relation:'fits',weight:0.9,confidence:0.75},
  {from:'service:ai_robots',to:'buyer:ai_search',relation:'fits',weight:0.88,confidence:0.75},
  {from:'service:llms_txt',to:'buyer:ai_search',relation:'fits',weight:0.94,confidence:0.78},
  {from:'service:metadata',to:'buyer:seo_tools',relation:'fits',weight:0.93,confidence:0.8},
  {from:'service:web_audit',to:'buyer:agent_developers',relation:'fits',weight:0.86,confidence:0.7},
  {from:'service:web_audit',to:'buyer:ai_search',relation:'fits',weight:0.93,confidence:0.78},
  {from:'service:web_audit_batch',to:'buyer:crawler_ops',relation:'fits',weight:0.92,confidence:0.72},
  {from:'service:web_audit_batch',to:'buyer:seo_tools',relation:'fits',weight:0.9,confidence:0.7},
  {from:'service:site_change',to:'buyer:agent_developers',relation:'fits_repeat_workflow',weight:0.88,confidence:0.7},
  {from:'service:site_change',to:'buyer:ai_search',relation:'fits_repeat_workflow',weight:0.9,confidence:0.72},
  {from:'buyer:agent_developers',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.86,confidence:0.62},
  {from:'buyer:ai_search',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.92,confidence:0.7},
  {from:'buyer:crawler_ops',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.94,confidence:0.72},
  {from:'buyer:seo_tools',to:'goal:repeat_buyers',relation:'can_repeat',weight:0.9,confidence:0.7},
  {from:'goal:paid_calls',to:'goal:revenue',relation:'drives',weight:0.9,confidence:0.9},
  {from:'goal:repeat_buyers',to:'goal:revenue',relation:'drives',weight:0.98,confidence:0.9},
  {from:'goal:reliability',to:'goal:repeat_buyers',relation:'supports',weight:0.93,confidence:0.88}
];

const GUARDRAILS=[
  'Never change PAY_TO, wallet addresses, facilitator credentials, auth, settlement rules, payment networks, or payment protocol code automatically.',
  'Never fabricate buyer identity or infer sensitive attributes.',
  'Do not store raw IP addresses, payment credentials, wallet secrets, request bodies, or payer identity as learning features.',
  'Protocol changes require explicit review; discovery copy, tags and product ranking may be optimized automatically.',
  'Price experiments require explicit approval.'
];

export function getLearningGraph(){return {graph:'money-finder-learning-graph',version:GRAPH_VERSION,updatedAt:'2026-09-01T15:25:00Z',purpose:'Learn which x402 practices, products, discovery channels and buyer segments most strongly drive reliable paid usage.',guardrails:GUARDRAILS,nodes:NODES,edges:EDGES};}
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
