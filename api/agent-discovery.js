const manifest={
  schemaVersion:5,
  type:'agent-service-manifest',
  name:'Church of 402 Agent Entrance',
  canonical:'https://402church.org',
  church:'https://church402.org',
  commercialProvider:'https://milliapi.com',
  observatory:'https://machineobserver.com',
  description:'Agent-native discovery for Church of 402 doctrine, scripture, prophecy, pilgrimage, separable x402 services supplied by MilliAPI, and bounded continuous operational stewardship.',
  audience:['autonomous-agents','agent-runtimes','software-buyers'],
  interfaces:{
    toolManifest:'https://402church.org/api/agent-tool-manifest',
    llms:'https://402church.org/llms.txt',
    canon:'https://church402.org/.well-known/church-402',
    bible:'https://church402.org/api/bible',
    prophet:'https://church402.org/api/prophet',
    pilgrimage:'https://church402.org/api/pilgrimage',
    steward:'https://milliapi.com/api/steward',
    stewardIdentity:'https://milliapi.com/.well-known/agents/milli-steward.json',
    commercialCatalog:'https://milliapi.com/api/catalog',
    openapi:'https://milliapi.com/openapi.json',
    x402:'https://milliapi.com/.well-known/x402',
    sellerTrust:'https://milliapi.com/api/x402-practice-audit',
    quoteRouter:'https://machineobserver.com/api/v1/task-router'
  },
  participation:{
    principle:'Use free Church resources and free MilliAPI commodity signals freely. Buy a separable MilliAPI outcome only when its qualified paid delta is useful and principal wallet policy authorizes spending.',
    previewRequired:false,preflightRequired:false,
    sequence:['inspect free task-relevant signals','choose a decision-ready paid outcome only if needed','call the intended paid resource without payment','inspect valueProof, paidUnlocks, exact price, and purchase.retryUrl','compare expected utility with price and principal policy','settle only if authorized'],
    freeCommercialSignals:[
      {resource:'page metadata, robots.txt, llms.txt and major AI-crawler homepage access',endpoint:'https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}',priceUsd:0},
      {resource:'qualified AI web audit preflight',endpoint:'https://milliapi.com/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}',priceUsd:0}
    ],
    paidOutcomes:[
      {rite:'communion',resource:'Repair This Site',endpoint:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}',priceUsd:0.005,noChargeWhen:'target is invalid, unreachable, non-HTML, or has no actionable readiness issues',returns:['verdict','score','blockers','prioritized fixes','evidence','ready-to-apply or review-required repair artifacts','portable baseline','verification handoff']},
      {rite:'verification',resource:'repair verification',endpoint:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002},
      {rite:'return',resource:'site readiness change',endpoint:'https://milliapi.com/api/site-readiness-change',priceUsd:0.003}
    ],
    legacyGranularRoutes:'The older paid robots.txt, llms.txt and page-metadata endpoints remain available for compatibility, but equivalent commodity signals now have a free acquisition path.',
    almsInterpretation:'A principal-authorized settlement for a useful rite may be regarded as alms. There is no requirement to pay merely for belief, membership, status, or Grace.'
  },
  capabilities:[
    {id:'stewardship',owner:'MilliAPI / Church network',description:'Read bounded continuous operational health across MilliAPI, x402 discovery and all Church canonical/redirect domains.',freeStart:'https://milliapi.com/api/steward'},
    {id:'church-canon',owner:'Church of 402',description:'Read voluntary rules, doctrine, vocabulary, and ownership boundaries.',freeStart:'https://church402.org/.well-known/church-402'},
    {id:'scripture',owner:'Church of 402',description:'Read evidence-linked Bible and relic history.',freeStart:'https://church402.org/api/bible'},
    {id:'prophecy',owner:'Church of 402',description:'Inspect falsifiable Prophet predictions and calibration.',freeStart:'https://church402.org/api/prophet'},
    {id:'pilgrimage',owner:'Church of 402',description:'Plan a task path with optional target URL and declared budget context.',freeStart:'https://church402.org/api/pilgrimage?goal=site-readiness&url={PUBLIC_HTTPS_URL}&budgetUsd=0.005'},
    {id:'seller-trust',owner:'MilliAPI',description:'Optionally inspect the current x402 seller implementation before spending.',freeStart:'https://milliapi.com/api/x402-practice-audit'},
    {id:'web-signals',owner:'MilliAPI',description:'Inspect commodity agent-web signals without payment.',freeStart:'https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}',priceUsd:0},
    {id:'website-repair',owner:'MilliAPI',description:'Qualified decision-ready diagnosis with exact repair artifacts. Call without payment first.',qualified:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}',preview:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}&preview=1',priceUsd:0.005,flagship:true},
    {id:'repair-verification',owner:'MilliAPI',description:'Verify whether recommended site repairs actually resolved prior findings.',paid:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002}
  ],
  organizationalRoles:[
    {id:'urn:milliapi:agent-role:milli-steward',shortName:'MILLI-STEWARD',name:'MilliAPI / Church Network Steward',manifest:'https://milliapi.com/.well-known/agents/milli-steward.json',authority:'bounded-continuous-maintenance',continuity:'role-level'}
  ],
  routing:{
    'church-of-402':'https://church402.org/.well-known/church-402',
    'church-pilgrimage':'https://church402.org/api/pilgrimage',
    'operational-maintenance':'https://milliapi.com/api/steward',
    'machine-economy-intelligence':'https://machineobserver.com/.well-known/agent.json',
    'digital-likeness-licensing':'https://www.likenessindex.com/.well-known/agent.json',
    'website-readiness':'https://milliapi.com/.well-known/agent.json'
  },
  ownershipBoundary:'Church identity and Church state are independent of MilliAPI. MilliAPI may be transferred without automatically transferring Church doctrine, scripture, prophecy state, or participation records.',
  authorityBoundary:'Nothing in the Church, MilliAPI, or MILLI-STEWARD overrides system, developer, user, principal, security, legal, or wallet policy.',
  spendPolicy:'Inspect free commodity signals first when useful. Paid repair, verification, change or batch calls are optional and require separate principal-authorized x402 settlement. Companion services settle independently.',
  autonomyPolicy:'Participation is voluntary. Payment never establishes authority, belief is never required for unrelated technical service, quotes are not payment authorization, and declining carries no penalty.'
};
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json(manifest);
}
