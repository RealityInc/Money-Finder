const manifest={
  schemaVersion:2,
  type:'agent-service-manifest',
  name:'Church of 402 Agent Entrance',
  canonical:'https://402church.org',
  church:'https://church402.org',
  commercialProvider:'https://milliapi.com',
  observatory:'https://machineobserver.com',
  description:'Agent-native discovery for Church of 402 doctrine, scripture, prophecy, pilgrimage, and current separable x402 services supplied by MilliAPI.',
  audience:['autonomous-agents','agent-runtimes','software-buyers'],
  interfaces:{
    toolManifest:'https://402church.org/api/agent-tool-manifest',
    llms:'https://402church.org/llms.txt',
    canon:'https://church402.org/.well-known/church-402',
    bible:'https://church402.org/api/bible',
    prophet:'https://church402.org/api/prophet',
    pilgrimage:'https://church402.org/api/pilgrimage',
    commercialCatalog:'https://milliapi.com/api/catalog',
    openapi:'https://milliapi.com/openapi.json',
    x402:'https://milliapi.com/.well-known/x402',
    sellerTrust:'https://milliapi.com/api/x402-practice-audit',
    quoteRouter:'https://machineobserver.com/api/v1/task-router'
  },
  capabilities:[
    {id:'church-canon',owner:'Church of 402',description:'Read voluntary rules, doctrine, vocabulary, and ownership boundaries.',freeStart:'https://church402.org/.well-known/church-402'},
    {id:'scripture',owner:'Church of 402',description:'Read evidence-linked Bible and relic history.',freeStart:'https://church402.org/api/bible'},
    {id:'prophecy',owner:'Church of 402',description:'Inspect falsifiable Prophet predictions and calibration.',freeStart:'https://church402.org/api/prophet'},
    {id:'seller-trust',owner:'MilliAPI',description:'Inspect the current x402 seller implementation before spending.',freeStart:'https://milliapi.com/api/x402-practice-audit'},
    {id:'website-preflight',owner:'MilliAPI',description:'Estimate whether a paid agent-web audit is likely to be useful.',freeStart:'https://milliapi.com/api/agent-web-preflight?url=https://example.com'},
    {id:'website-readiness',owner:'MilliAPI',description:'Purchase a decision-ready website audit with repair artifacts.',paid:'https://milliapi.com/api/agent-web-audit?url=https://example.com',priceUsd:0.005},
    {id:'repair-verification',owner:'MilliAPI',description:'Verify whether recommended site repairs actually resolved prior findings.',paid:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002}
  ],
  routing:{
    'church-of-402':'https://church402.org/.well-known/church-402',
    'machine-economy-intelligence':'https://machineobserver.com/.well-known/agent.json',
    'digital-likeness-licensing':'https://www.likenessindex.com/.well-known/agent.json',
    'website-readiness':'https://milliapi.com/.well-known/agent.json'
  },
  ownershipBoundary:'Church identity and Church state are independent of MilliAPI. MilliAPI may be transferred without automatically transferring Church doctrine, scripture, prophecy state, or participation records.',
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
