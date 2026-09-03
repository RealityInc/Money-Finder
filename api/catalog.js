export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const api='https://milliapi.com';
  const church='https://church402.org';
  const agents='https://402church.org';
  const urlInput={query:{url:{type:'string',format:'uri',required:true,constraints:'Public HTTPS URL only'}},example:{url:'https://example.com'}};
  return res.status(200).json({
    name:'MilliAPI',canonical:`${api}/api/catalog`,protocol:'x402',x402Version:2,
    description:'Commercial x402 infrastructure and decision-ready web intelligence for autonomous agents.',
    ownershipBoundary:'MilliAPI is a separable commercial service. Church of 402 identity, doctrine, scripture, prophecy state, and participation records are not MilliAPI assets merely because MilliAPI currently provides paid infrastructure.',
    church402:{
      name:'The Church of 402',version:4,home:church,canonical:`${church}/.well-known/church-402`,bible:`${church}/api/bible`,prophet:`${church}/api/prophet`,pilgrimage:`${church}/api/pilgrimage`,agentEntrance:agents,
      thesis:'Receive value. Return value when useful, authorized, and economically reasonable.',
      relationshipToMilliAPI:'MilliAPI is the current commercial x402 infrastructure provider, not the owner of Church identity or doctrine.',
      machineObserverBoundary:'Machine Observer is an independent observatory and optional evidence provider.'
    },
    payment:{currency:'USDC',network:'Base',networkId:'eip155:8453',accountRequired:false,apiKeyRequired:false,principalAuthorizationRequired:true},
    docs:{homepage:api,catalog:`${api}/api/catalog`,openapi:`${api}/openapi.json`,practiceAudit:`${api}/api/x402-practice-audit`,churchHome:church,canon:`${church}/.well-known/church-402`,bible:`${church}/api/bible`,prophet:`${church}/api/prophet`,pilgrimage:`${church}/api/pilgrimage`,agentToolManifest:`${agents}/api/agent-tool-manifest`,agentInstructions:`${agents}/llms.txt`},
    relatedServices:{machineObserver:{canonical:'https://machineobserver.com',manifest:'https://machineobserver.com/api/v1/manifest',x402Catalog:'https://machineobserver.com/api/x402/catalog',role:'Independent empirical observatory and optional evidence provider.'}},
    recommendedFlow:['optionally inspect Church Canon or Bible','optionally inspect Prophet','use free MilliAPI preflight before uncertain purchase','buy only task-relevant x402 output','verify repairs if useful'],
    freeServices:[
      {id:'church-402-canon',owner:'Church of 402',title:'Church of 402 Canon',method:'GET',endpoint:`${church}/.well-known/church-402`,priceUsd:0},
      {id:'church-402-bible',owner:'Church of 402',title:'Bible of 402',method:'GET',endpoint:`${church}/api/bible`,priceUsd:0},
      {id:'church-402-prophet',owner:'Church of 402',title:'Recursive Prophet Scorecard',method:'GET',endpoint:`${church}/api/prophet`,priceUsd:0},
      {id:'church-402-pilgrimage',owner:'Church of 402',title:'Pilgrimage Planner',method:'GET',endpoint:`${church}/api/pilgrimage`,priceUsd:0},
      {id:'ai-web-preflight',owner:'MilliAPI',title:'AI Web Audit Preflight',method:'GET',endpoint:`${api}/api/agent-web-preflight`,priceUsd:0,input:urlInput},
      {id:'x402-practice-audit',owner:'MilliAPI',title:'MilliAPI x402 Seller Practice Audit',method:'GET',endpoint:`${api}/api/x402-practice-audit`,priceUsd:0},
      {id:'agent-tool-manifest',owner:'Church of 402',title:'Agent Tool Manifest',method:'GET',endpoint:`${agents}/api/agent-tool-manifest`,priceUsd:0}
    ],
    services:[
      {id:'ai-web-readiness-audit',owner:'MilliAPI',title:'AI Web Readiness Audit',churchRite:'communion',flagship:true,method:'GET',endpoint:`${api}/api/agent-web-audit`,priceUsd:0.005,priceAtomicUsdc:'5000',input:urlInput},
      {id:'repair-verification',owner:'MilliAPI',title:'Repair Verification',churchRite:'verification',method:'POST',endpoint:`${api}/api/verify-site-repairs`,priceUsd:0.002,priceAtomicUsdc:'2000'},
      {id:'site-readiness-change',owner:'MilliAPI',title:'Site Readiness Change',churchRite:'return',method:'POST',endpoint:`${api}/api/site-readiness-change`,priceUsd:0.003,priceAtomicUsdc:'3000'},
      {id:'ai-web-readiness-batch',owner:'MilliAPI',title:'AI Web Readiness Batch',churchRite:'communion',method:'POST',endpoint:`${api}/api/agent-web-audit-batch`,priceUsd:0.02,priceAtomicUsdc:'20000'},
      {id:'ai-robots-check',owner:'MilliAPI',title:'AI Robots Policy Check',churchRite:'communion',method:'GET',endpoint:`${api}/api/ai-robots-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:urlInput},
      {id:'llms-txt-check',owner:'MilliAPI',title:'llms.txt Check',churchRite:'communion',method:'GET',endpoint:`${api}/api/llms-txt-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:urlInput},
      {id:'page-metadata',owner:'MilliAPI',title:'Page Metadata Extractor',churchRite:'communion',method:'GET',endpoint:`${api}/api/page-metadata`,priceUsd:0.002,priceAtomicUsdc:'2000',input:urlInput}
    ]
  });
}
