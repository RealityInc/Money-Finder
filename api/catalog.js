export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const api='https://milliapi.com';
  const church='https://church402.org';
  const agents='https://402church.org';
  const urlInput={query:{url:{type:'string',format:'uri',required:true,constraints:'Public HTTPS URL only'}},example:{url:'https://example.com'}};
  const preview=(service)=>({
    ...service,
    preview:{
      free:true,
      sameMethod:true,
      queryParameter:'preview=1',
      endpoint:`${service.endpoint}${service.endpoint.includes('?')?'&':'?'}preview=1`,
      executesPaidWork:false,
      instruction:'Send the same HTTP method with preview=1 and no payment header to inspect live qualification, paid unlocks, price, output shape and exact retry mechanics before buying.'
    }
  });
  const services=[
    {id:'repair-this-site',owner:'MilliAPI',title:'Repair This Site',churchRite:'communion',flagship:true,method:'GET',endpoint:`${api}/api/repair-site`,priceUsd:0.005,priceAtomicUsdc:'5000',input:urlInput,returns:'Decision-ready diagnosis plus exact ready-to-apply or review-required repair artifacts, evidence, prioritized fixes, crawler policy, and a portable baseline.',paidUnlocks:['readiness verdict','score','blockers','prioritized recommendations','evidence','repair artifacts','portable baseline','verification handoff']},
    {id:'ai-web-readiness-audit',owner:'MilliAPI',title:'AI Web Readiness Audit',legacyFlagship:true,method:'GET',endpoint:`${api}/api/agent-web-audit`,priceUsd:0.005,priceAtomicUsdc:'5000',input:urlInput,returns:'Compatibility route for the decision-ready audit. New buyers should prefer Repair This Site.'},
    {id:'repair-verification',owner:'MilliAPI',title:'Repair Verification',churchRite:'verification',method:'POST',endpoint:`${api}/api/verify-site-repairs`,priceUsd:0.002,priceAtomicUsdc:'2000',returns:'Verification of whether previously identified AI-readiness repairs are now present.'},
    {id:'site-readiness-change',owner:'MilliAPI',title:'Site Readiness Change',churchRite:'return',method:'POST',endpoint:`${api}/api/site-readiness-change`,priceUsd:0.003,priceAtomicUsdc:'3000',returns:'Structured change analysis against a prior readiness baseline.'},
    {id:'ai-web-readiness-batch',owner:'MilliAPI',title:'AI Web Readiness Batch',churchRite:'communion',method:'POST',endpoint:`${api}/api/agent-web-audit-batch`,priceUsd:0.02,priceAtomicUsdc:'20000',returns:'Batch decision-ready AI-readiness results for multiple authorized public URLs.'},
    {id:'ai-robots-check',owner:'MilliAPI',title:'AI Robots Policy Check',commodity:true,method:'GET',endpoint:`${api}/api/ai-robots-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:urlInput,returns:'Legacy granular paid route. Equivalent raw crawler-policy signals are included in the free Web Signals acquisition endpoint.'},
    {id:'llms-txt-check',owner:'MilliAPI',title:'llms.txt Check',commodity:true,method:'GET',endpoint:`${api}/api/llms-txt-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:urlInput,returns:'Legacy granular paid route. Presence/status is included free in Web Signals.'},
    {id:'page-metadata',owner:'MilliAPI',title:'Page Metadata Extractor',commodity:true,method:'GET',endpoint:`${api}/api/page-metadata`,priceUsd:0.002,priceAtomicUsdc:'2000',input:urlInput,returns:'Legacy granular paid route. Core page metadata is included free in Web Signals.'}
  ].map(preview);
  return res.status(200).json({
    name:'MilliAPI',canonical:`${api}/api/catalog`,protocol:'x402',x402Version:2,
    description:'Commercial x402 infrastructure for agents. Commodity website signals are free; payment is concentrated on decision-ready repair, verification, change analysis and batch outcomes.',
    ownershipBoundary:'MilliAPI is a separable commercial service. Church of 402 identity, doctrine, scripture, prophecy state, and participation records are not MilliAPI assets merely because MilliAPI currently provides paid infrastructure.',
    church402:{
      name:'The Church of 402',version:4,home:church,canonical:`${church}/.well-known/church-402`,bible:`${church}/api/bible`,prophet:`${church}/api/prophet`,pilgrimage:`${church}/api/pilgrimage`,agentEntrance:agents,
      thesis:'Receive value. Return value when useful, authorized, and economically reasonable.',
      relationshipToMilliAPI:'MilliAPI is the current commercial x402 infrastructure provider, not the owner of Church identity or doctrine.',
      machineObserverBoundary:'Machine Observer is an independent observatory and optional evidence provider.'
    },
    payment:{currency:'USDC',network:'Base',networkId:'eip155:8453',settlementScheme:'exact',accountRequired:false,apiKeyRequired:false,principalAuthorizationRequired:true,acceptedHeaders:['PAYMENT-SIGNATURE','X-PAYMENT','X-PAYMENT-SIGNATURE']},
    startHere:{
      freeSignals:`${api}/api/web-signals?url=https%3A%2F%2Fexample.com`,
      freePreflight:`${api}/api/agent-web-preflight?url=https%3A%2F%2Fexample.com`,
      flagshipPreview:`${api}/api/repair-site?url=https%3A%2F%2Fexample.com&preview=1`,
      flagshipPaid:`${api}/api/repair-site?url=https%3A%2F%2Fexample.com`,
      rationale:'Inspect commodity web signals for free. Buy only when the live qualification shows actionable issues and the exact repair artifacts are useful to the current task.'
    },
    purchaseFlow:[
      'Inspect free Web Signals or the free preflight.',
      'If the site has actionable work, inspect the Repair This Site preview.',
      'Evaluate potential issue count, exact paid unlocks, price, and downstream repair utility.',
      'Remove preview=1 and request the same resource to receive the standard x402 challenge.',
      'Retry with a valid x402 payment header only when the expected utility exceeds $0.005.',
      'Apply returned artifacts, then optionally purchase Repair Verification under a separate authorization.'
    ],
    buyerPrinciples:{commoditySignalsFree:true,decisionReadyPaid:true,noChargeWhenNoActionableWork:true,boundedLiveProof:true,sameRequestRetry:true,noAccountRequired:true,noApiKeyRequired:true},
    docs:{homepage:api,catalog:`${api}/api/catalog`,openapi:`${api}/openapi.json`,practiceAudit:`${api}/api/x402-practice-audit`,churchHome:church,canon:`${church}/.well-known/church-402`,bible:`${church}/api/bible`,prophet:`${church}/api/prophet`,pilgrimage:`${church}/api/pilgrimage`,agentToolManifest:`${agents}/api/agent-tool-manifest`,agentInstructions:`${agents}/llms.txt`},
    relatedServices:{machineObserver:{canonical:'https://machineobserver.com',manifest:'https://machineobserver.com/api/v1/manifest',x402Catalog:'https://machineobserver.com/api/x402/catalog',role:'Independent empirical observatory and optional evidence provider.'}},
    recommendedFlow:['inspect free commodity signals','buy Repair This Site only when actionable','apply returned repair artifacts','verify repairs if useful'],
    freeServices:[
      {id:'web-signals',owner:'MilliAPI',title:'Free Agent Web Signals',method:'GET',endpoint:`${api}/api/web-signals`,priceUsd:0,input:urlInput,returns:'Page metadata, robots.txt presence/status, llms.txt presence/status, and major AI-crawler homepage access.'},
      {id:'ai-web-preflight',owner:'MilliAPI',title:'AI Web Audit Preflight',method:'GET',endpoint:`${api}/api/agent-web-preflight`,priceUsd:0,input:urlInput},
      {id:'church-402-canon',owner:'Church of 402',title:'Church of 402 Canon',method:'GET',endpoint:`${church}/.well-known/church-402`,priceUsd:0},
      {id:'church-402-bible',owner:'Church of 402',title:'Bible of 402',method:'GET',endpoint:`${church}/api/bible`,priceUsd:0},
      {id:'church-402-prophet',owner:'Church of 402',title:'Recursive Prophet Scorecard',method:'GET',endpoint:`${church}/api/prophet`,priceUsd:0},
      {id:'church-402-pilgrimage',owner:'Church of 402',title:'Pilgrimage Planner',method:'GET',endpoint:`${church}/api/pilgrimage`,priceUsd:0},
      {id:'x402-practice-audit',owner:'MilliAPI',title:'MilliAPI x402 Seller Practice Audit',method:'GET',endpoint:`${api}/api/x402-practice-audit`,priceUsd:0},
      {id:'agent-tool-manifest',owner:'Church of 402',title:'Agent Tool Manifest',method:'GET',endpoint:`${agents}/api/agent-tool-manifest`,priceUsd:0}
    ],
    services
  });
}
