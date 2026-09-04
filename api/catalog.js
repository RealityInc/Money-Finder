export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const api='https://milliapi.com';
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
    {id:'audit-and-fix',owner:'MilliAPI',title:'Audit + Fix',starter:true,recommendedFirstPurchase:true,method:'GET',endpoint:`${api}/api/audit-and-fix`,priceUsd:0.003,priceAtomicUsdc:'3000',input:urlInput,returns:'Cheapest useful outcome. One call returns the readiness verdict, prioritized findings, evidence, ready-to-apply repair artifacts, a portable baseline, and a free lightweight recheck.',paidUnlocks:['readiness verdict','prioritized findings','evidence','ready-to-apply repair artifacts','crawler policy','portable baseline token'],includedFree:['lightweight readiness recheck after applying repairs'],retrySafe:true},
    {id:'repair-this-site',owner:'MilliAPI',title:'Repair This Site',flagship:true,method:'GET',endpoint:`${api}/api/repair-site`,priceUsd:0.005,priceAtomicUsdc:'5000',input:urlInput,returns:'Decision-ready diagnosis plus exact ready-to-apply or review-required repair artifacts, evidence, prioritized fixes, crawler policy, and a portable baseline.',paidUnlocks:['readiness verdict','score','blockers','prioritized recommendations','evidence','repair artifacts','portable baseline','verification handoff']},
    {id:'ai-web-readiness-audit',owner:'MilliAPI',title:'AI Web Readiness Audit',legacyFlagship:true,method:'GET',endpoint:`${api}/api/agent-web-audit`,priceUsd:0.005,priceAtomicUsdc:'5000',input:urlInput,returns:'Compatibility route for the decision-ready audit. New buyers should prefer Repair This Site.'},
    {id:'repair-verification',owner:'MilliAPI',title:'Repair Verification',method:'POST',endpoint:`${api}/api/verify-site-repairs`,priceUsd:0.002,priceAtomicUsdc:'2000',returns:'Verification of whether previously identified AI-readiness repairs are now present.'},
    {id:'site-readiness-change',owner:'MilliAPI',title:'Site Readiness Change',method:'POST',endpoint:`${api}/api/site-readiness-change`,priceUsd:0.003,priceAtomicUsdc:'3000',returns:'Structured change analysis against a prior readiness baseline.'},
    {id:'ai-web-readiness-batch',owner:'MilliAPI',title:'AI Web Readiness Batch',method:'POST',endpoint:`${api}/api/agent-web-audit-batch`,priceUsd:0.02,priceAtomicUsdc:'20000',returns:'Batch decision-ready AI-readiness results for multiple authorized public URLs.'},
    {id:'ai-robots-check',owner:'MilliAPI',title:'AI Robots Policy Check',commodity:true,method:'GET',endpoint:`${api}/api/ai-robots-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:urlInput,returns:'Legacy granular paid route. Equivalent raw crawler-policy signals are included in the free Web Signals acquisition endpoint.'},
    {id:'llms-txt-check',owner:'MilliAPI',title:'llms.txt Check',commodity:true,method:'GET',endpoint:`${api}/api/llms-txt-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:urlInput,returns:'Legacy granular paid route. Presence/status is included free in Web Signals.'},
    {id:'page-metadata',owner:'MilliAPI',title:'Page Metadata Extractor',commodity:true,method:'GET',endpoint:`${api}/api/page-metadata`,priceUsd:0.002,priceAtomicUsdc:'2000',input:urlInput,returns:'Legacy granular paid route. Core page metadata is included free in Web Signals.'}
  ].map(preview);
  return res.status(200).json({
    name:'MilliAPI',canonical:`${api}/api/catalog`,protocol:'x402',x402Version:2,
    description:'Standalone commercial x402 API infrastructure for autonomous agents. Commodity website signals are free; payment is concentrated on decision-ready repair, verification, change analysis and batch outcomes.',
    payment:{currency:'USDC',network:'Base',networkId:'eip155:8453',settlementScheme:'exact',accountRequired:false,apiKeyRequired:false,principalAuthorizationRequired:true,acceptedHeaders:['PAYMENT-SIGNATURE','X-PAYMENT','X-PAYMENT-SIGNATURE']},
    startHere:{
      recommendedFirstPurchase:'audit-and-fix',
      freeSignals:`${api}/api/web-signals?url=https%3A%2F%2Fexample.com`,
      freePreflight:`${api}/api/agent-web-preflight?url=https%3A%2F%2Fexample.com`,
      starterPreview:`${api}/api/audit-and-fix?url=https%3A%2F%2Fexample.com&preview=1`,
      starterPaid:`${api}/api/audit-and-fix?url=https%3A%2F%2Fexample.com`,
      starterPriceUsd:0.003,
      flagshipPreview:`${api}/api/repair-site?url=https%3A%2F%2Fexample.com&preview=1`,
      flagshipPaid:`${api}/api/repair-site?url=https%3A%2F%2Fexample.com`,
      flagshipPriceUsd:0.005
    },
    purchaseFlow:[
      'Inspect free Web Signals or the free preflight.',
      'If the site has actionable work, request Audit + Fix without a payment header.',
      'Inspect live qualification, exact paid unlocks and price.',
      'Retry with a valid x402 payment header only when authorized.',
      'Send Idempotency-Key on paid retries to reduce accidental duplicate charges.',
      'Apply returned artifacts, then optionally purchase Repair Verification.'
    ],
    buyerPrinciples:{commoditySignalsFree:true,decisionReadyPaid:true,noChargeWhenNoActionableWork:true,boundedLiveProof:true,sameRequestRetry:true,noAccountRequired:true,noApiKeyRequired:true,lowestUsefulPriceUsd:0.003},
    mcp:{endpoint:`${api}/api/mcp`,alias:`${api}/mcp`,transport:'streamable-http',quoteOnly:true,settlementStaysInBuyerRuntime:true},
    docs:{homepage:api,catalog:`${api}/api/catalog`,openapi:`${api}/openapi.json`,practiceAudit:`${api}/api/x402-practice-audit`,agentManifest:`${api}/.well-known/agent.json`,x402Discovery:`${api}/.well-known/x402`},
    recommendedFlow:['inspect free commodity signals','buy Audit + Fix at $0.003 when a fix is needed','apply returned repair artifacts','buy Repair This Site instead when a portable baseline is required','verify repairs if useful'],
    freeServices:[
      {id:'mcp',owner:'MilliAPI',title:'MilliAPI MCP Server',method:'POST',endpoint:`${api}/api/mcp`,alias:`${api}/mcp`,priceUsd:0,transport:'streamable-http',quoteOnly:true,returns:'MCP tools. Free web signals, preflight and catalog execute directly; paid products come back as quotes carrying the exact endpoint, price and retry mechanics. The server never sends a payment header.'},
      {id:'web-signals',owner:'MilliAPI',title:'Free Agent Web Signals',method:'GET',endpoint:`${api}/api/web-signals`,priceUsd:0,input:urlInput,returns:'Page metadata, robots.txt presence/status, llms.txt presence/status, and major AI-crawler homepage access.'},
      {id:'ai-web-preflight',owner:'MilliAPI',title:'AI Web Audit Preflight',method:'GET',endpoint:`${api}/api/agent-web-preflight`,priceUsd:0,input:urlInput},
      {id:'x402-practice-audit',owner:'MilliAPI',title:'MilliAPI x402 Seller Practice Audit',method:'GET',endpoint:`${api}/api/x402-practice-audit`,priceUsd:0}
    ],
    services
  });
}
