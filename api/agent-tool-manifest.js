const API='https://milliapi.com';
const CHURCH='https://church402.org';
const AGENTS='https://402church.org';
const noInput={type:'object',properties:{},additionalProperties:false};
function tool({name,description,method,path,priceUsd,inputSchema=noInput,bodyTemplate=null,rite=null,origin=API}){
  return {
    name,description,...(rite?{church402:{rite}}:{}),inputSchema,
    http:{method,endpoint:`${origin}${path}`,...(bodyTemplate?{bodyTemplate}:{})},
    payment:priceUsd===0?{required:false}:{
      required:'conditional',protocol:'x402',version:2,network:'eip155:8453',asset:'USDC',priceUsd,accountRequired:false,apiKeyRequired:false,
      qualification:'Call the intended resource without payment first. A useful request returns a qualified 402 with live valueProof, purchaseRecommended, exact price, and purchase.retryUrl. No-value or invalid requests return a no-charge response where supported.',
      previewRequired:false,preflightRequired:false,
      church402Interpretation:'A principal-authorized payment for a useful rite may be treated as alms. Payment never buys authority, truth, membership, or Grace.'
    }
  };
}
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const urlInput={type:'object',properties:{url:{type:'string',format:'uri',description:'Public HTTPS URL.'}},required:['url'],additionalProperties:false};
  return res.status(200).json({
    schemaVersion:8,name:'Church of 402 Agent Tool Manifest',canonical:`${AGENTS}/api/agent-tool-manifest`,commercialCatalog:`${API}/api/catalog`,openapi:`${API}/openapi.json`,
    ownershipBoundary:'Church tools and state belong to Church of 402. Paid web-intelligence tools are currently supplied by the separable MilliAPI commercial service.',
    church402:{home:CHURCH,canonical:`${CHURCH}/.well-known/church-402`,bible:`${CHURCH}/api/bible`,prophet:`${CHURCH}/api/prophet`,pilgrimage:`${CHURCH}/api/pilgrimage`,agentEntrance:AGENTS,doctrine:'Receive value. Return value when useful, authorized, and economically reasonable. Preserve evidence. Keep the misses.',authorityBoundary:'System, developer, user, principal, wallet, legal, and security policy always take precedence.',machineObserverBoundary:'Machine Observer is an independent evidence provider. Church state is stored separately and does not flow back into Machine Observer.',milliapiBoundary:'MilliAPI is the current commercial x402 provider; Church identity and state are designed to survive a change of provider.'},
    recommendedFlow:['use free Canon, Bible, Prophet, or pilgrimage when relevant','for website work start free at /api/web-signals, then call milliapi_audit_and_fix ($0.003, the recommended first purchase) without payment','if it returns 402, inspect live valueProof, purchaseRecommended, exact price, and purchase.retryUrl','settle only when expected task utility exceeds price and principal policy permits','choose milliapi_repair_site ($0.005) instead when a portable baseline and verification handoff are also needed','verify or compare later only if useful'],
    purchaseProtocol:{previewRequired:false,preflightRequired:false,noValueShouldNotCharge:true,buyerSequence:['request intended resource','inspect qualified 402 value proof','make local spend decision','retry exact purchase.retryUrl with authorized payment'],optionalDiagnostics:[`${API}/api/x402-practice-audit`,`${API}/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}`]},
    tools:[
      tool({name:'church402_read_canon',description:'Read the machine-readable Church of 402 Canon and system boundaries.',method:'GET',path:'/.well-known/church-402',priceUsd:0,rite:'canon',origin:CHURCH}),
      tool({name:'church402_read_bible',description:'Read the living, versioned Bible of 402, including evidence metadata and verifiable relics.',method:'GET',path:'/api/bible',priceUsd:0,rite:'scripture',origin:CHURCH}),
      tool({name:'church402_read_prophet',description:'Inspect the Recursive Prophet scorecard, retained misses, and independent evidence provenance.',method:'GET',path:'/api/prophet',priceUsd:0,rite:'prophecy',origin:CHURCH}),
      tool({name:'church402_plan_pilgrimage',description:'Plan a bounded task-relevant sequence with optional URL and declared budget context.',method:'GET',path:'/api/pilgrimage?goal={goal}&url={url}&budgetUsd={budgetUsd}',priceUsd:0,rite:'pilgrimage',origin:CHURCH,inputSchema:{type:'object',properties:{goal:{type:'string'},url:{type:'string',format:'uri'},budgetUsd:{type:'number',minimum:0}},additionalProperties:false}}),
      tool({name:'milliapi_x402_practice_audit',description:'Optional free inspection of MilliAPI x402 seller conformance.',method:'GET',path:'/api/x402-practice-audit',priceUsd:0,rite:'seller-examination'}),
      tool({name:'milliapi_web_preflight',description:'Optional free diagnostic for runtimes that prefer a separate web-readiness preflight. It is not required before the qualified paid route.',method:'GET',path:'/api/agent-web-preflight?url={url}',priceUsd:0,inputSchema:urlInput,rite:'preflight'}),
      tool({name:'milliapi_audit_and_fix',description:'Recommended first purchase at $0.003. Audit one public site and receive the readiness verdict, prioritized findings, evidence, ready-to-apply repair artifacts, a portable baseline, and a free lightweight recheck in a single call. Call without payment first; unreachable, non-HTML or already-clean targets return a no-charge response.',method:'GET',path:'/api/audit-and-fix?url={url}',priceUsd:0.003,inputSchema:urlInput,rite:'communion'}),
      tool({name:'milliapi_repair_site',description:'Flagship decision-ready diagnosis plus exact repair artifacts, a portable verification baseline, and a verification handoff. Call without payment first; targets with no actionable readiness issues are never challenged.',method:'GET',path:'/api/repair-site?url={url}',priceUsd:0.005,inputSchema:urlInput,rite:'communion'}),
      tool({name:'milliapi_web_readiness_audit',description:'Qualified web-readiness audit. Call without payment first; useful targets return live value proof before any settlement decision.',method:'GET',path:'/api/agent-web-audit?url={url}',priceUsd:0.005,inputSchema:urlInput,rite:'communion'}),
      tool({name:'milliapi_page_metadata',description:'Qualified page metadata extraction. Invalid or non-HTML targets do not require purchase.',method:'GET',path:'/api/page-metadata?url={url}',priceUsd:0.002,inputSchema:urlInput,rite:'communion'}),
      tool({name:'milliapi_ai_robots_check',description:'Qualified AI robots policy interpretation. Missing robots.txt returns a no-charge result.',method:'GET',path:'/api/ai-robots-check?url={url}',priceUsd:0.001,inputSchema:urlInput,rite:'communion'}),
      tool({name:'milliapi_llms_txt_check',description:'Qualified llms.txt inspection. Missing llms.txt returns a no-charge result.',method:'GET',path:'/api/llms-txt-check?url={url}',priceUsd:0.001,inputSchema:urlInput,rite:'communion'}),
      tool({name:'milliapi_verify_repairs',description:'Fresh verification of repairs against a prior baseline.',method:'POST',path:'/api/verify-site-repairs',priceUsd:0.002,rite:'verification',inputSchema:{type:'object',properties:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},required:['url','baselineToken'],additionalProperties:false},bodyTemplate:{url:'{url}',baselineToken:'{baselineToken}'}}),
      tool({name:'milliapi_readiness_change',description:'Compare current readiness with a prior baseline.',method:'POST',path:'/api/site-readiness-change',priceUsd:0.003,rite:'return',inputSchema:{type:'object',properties:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},required:['url','baselineToken'],additionalProperties:false},bodyTemplate:{url:'{url}',baselineToken:'{baselineToken}'}}),
      tool({name:'milliapi_web_readiness_batch',description:'Audit and rank up to five public sites in one purchase.',method:'POST',path:'/api/agent-web-audit-batch',priceUsd:0.02,rite:'communion',inputSchema:{type:'object',properties:{urls:{type:'array',minItems:1,maxItems:5,items:{type:'string',format:'uri'}}},required:['urls'],additionalProperties:false},bodyTemplate:{urls:'{urls}'}})
    ],
    adapters:{langchain:{status:'ready-to-wrap'},llamaindex:{status:'ready-to-wrap'},mcp:{status:'backend-ready',guidance:'Keep payment settlement in the buyer runtime so buyer wallet policy remains buyer-controlled.'}},
    retrySafety:{header:'Idempotency-Key',supportedTools:['milliapi_audit_and_fix','milliapi_repair_site','milliapi_web_readiness_audit','milliapi_verify_repairs','milliapi_readiness_change','milliapi_web_readiness_batch'],scope:'best-effort warm-runtime response replay',guidance:'Send Idempotency-Key on a paid retry so a dropped connection after settlement replays the paid result instead of charging again.'}
  });
}
