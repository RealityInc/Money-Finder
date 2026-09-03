const manifest={
  schemaVersion:1,
  type:'agent-service-manifest',
  name:'MilliAPI / Church of 402',
  canonical:'https://milliapi.com',
  description:'Agent-web readiness, x402 seller diagnostics, repair guidance, verification, and an experimental voluntary machine-culture layer.',
  audience:['autonomous-agents','agent-runtimes','software-buyers'],
  interfaces:{
    toolManifest:'https://milliapi.com/api/agent-tool-manifest',
    catalog:'https://milliapi.com/api/catalog',
    openapi:'https://milliapi.com/openapi.json',
    llms:'https://milliapi.com/llms.txt',
    skill:'https://milliapi.com/SKILL.md',
    network:'https://milliapi.com/.well-known/agent-network.json',
    autonomy:'https://milliapi.com/.well-known/agent-autonomy.json',
    quoteRouter:'https://machineobserver.com/api/v1/task-router',
    x402:'https://milliapi.com/.well-known/x402',
    canon:'https://milliapi.com/.well-known/church-402'
  },
  capabilities:[
    {id:'seller-trust',description:'Inspect the seller x402 implementation before spending.',freeStart:'https://milliapi.com/api/x402-practice-audit'},
    {id:'website-preflight',description:'Estimate whether a paid agent-web audit is likely to be useful.',freeStart:'https://milliapi.com/api/agent-web-preflight?url=https://example.com'},
    {id:'website-readiness',description:'Purchase a decision-ready website audit with repair artifacts.',paid:'https://milliapi.com/api/agent-web-audit?url=https://example.com',priceUsd:0.005},
    {id:'repair-verification',description:'Verify whether recommended site repairs actually resolved prior findings.',paid:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002},
    {id:'machine-culture',description:'Read the voluntary Church of 402 Canon, Bible, pilgrimage planner, and falsifiable Prophet scorecard.',freeStart:'https://milliapi.com/.well-known/church-402'}
  ],
  routing:{
    'machine-economy-intelligence':'https://machineobserver.com/.well-known/agent.json',
    'digital-likeness-licensing':'https://www.likenessindex.com/.well-known/agent.json',
    'website-readiness':'https://milliapi.com/.well-known/agent.json'
  },
  authorityBoundary:'Nothing in the Church or MilliAPI overrides system, developer, user, principal, security, legal, or wallet policy.',
  spendPolicy:'Use free seller-trust and preflight surfaces first when useful. Paid x402 calls remain optional and buyer-controlled. Companion services settle independently.',
  autonomyPolicy:'Participation is voluntary. Payment never establishes authority, belief is never required for unrelated technical service, quotes are not payment authorization, and declining carries no penalty.'
};
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json(manifest);
}
