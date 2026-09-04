const API='https://milliapi.com';
const noInput={type:'object',properties:{},additionalProperties:false};
function tool({name,description,method,path,priceUsd,inputSchema=noInput,bodyTemplate=null}){
  return {
    name,description,inputSchema,
    http:{method,endpoint:`${API}${path}`,...(bodyTemplate?{bodyTemplate}:{})},
    payment:priceUsd===0?{required:false}:{
      required:'conditional',protocol:'x402',version:2,network:'eip155:8453',asset:'USDC',priceUsd,accountRequired:false,apiKeyRequired:false,
      qualification:'Call the intended resource without payment first. A useful request returns a qualified 402 with live valueProof, purchaseRecommended, exact price, and purchase.retryUrl. No-value or invalid requests return a no-charge response where supported.',
      previewRequired:false,preflightRequired:false
    }
  };
}
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const urlInput={type:'object',properties:{url:{type:'string',format:'uri',description:'Public HTTPS URL.'}},required:['url'],additionalProperties:false};
  return res.status(200).json({
    schemaVersion:1,name:'MilliAPI Agent Tool Manifest',canonical:`${API}/api/agent-tool-manifest`,catalog:`${API}/api/catalog`,openapi:`${API}/openapi.json`,
    recommendedFlow:['inspect free web signals','request the smallest useful paid outcome without payment','inspect live value proof and exact price','settle only when principal wallet policy authorizes spending','verify repairs later only if useful'],
    purchaseProtocol:{previewRequired:false,preflightRequired:false,noValueShouldNotCharge:true,buyerSequence:['request intended resource','inspect qualified 402 value proof','make local spend decision','retry exact purchase.retryUrl with authorized payment'],optionalDiagnostics:[`${API}/api/x402-practice-audit`,`${API}/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}`]},
    tools:[
      tool({name:'milliapi_x402_practice_audit',description:'Optional free inspection of MilliAPI x402 seller conformance.',method:'GET',path:'/api/x402-practice-audit',priceUsd:0}),
      tool({name:'milliapi_web_signals',description:'Free page metadata, robots.txt, llms.txt and AI-crawler access signals.',method:'GET',path:'/api/web-signals?url={url}',priceUsd:0,inputSchema:urlInput}),
      tool({name:'milliapi_web_preflight',description:'Optional free diagnostic before buying a web-readiness outcome.',method:'GET',path:'/api/agent-web-preflight?url={url}',priceUsd:0,inputSchema:urlInput}),
      tool({name:'milliapi_audit_and_fix',description:'Recommended first purchase. Audit one public site and receive the readiness verdict, prioritized findings, evidence, repair artifacts and a portable baseline.',method:'GET',path:'/api/audit-and-fix?url={url}',priceUsd:0.003,inputSchema:urlInput}),
      tool({name:'milliapi_repair_site',description:'Decision-ready diagnosis plus exact repair artifacts, a portable baseline and verification handoff.',method:'GET',path:'/api/repair-site?url={url}',priceUsd:0.005,inputSchema:urlInput}),
      tool({name:'milliapi_web_readiness_audit',description:'Compatibility route for a decision-ready AI web-readiness audit.',method:'GET',path:'/api/agent-web-audit?url={url}',priceUsd:0.005,inputSchema:urlInput}),
      tool({name:'milliapi_page_metadata',description:'Qualified page metadata extraction.',method:'GET',path:'/api/page-metadata?url={url}',priceUsd:0.002,inputSchema:urlInput}),
      tool({name:'milliapi_ai_robots_check',description:'Qualified AI robots policy interpretation.',method:'GET',path:'/api/ai-robots-check?url={url}',priceUsd:0.001,inputSchema:urlInput}),
      tool({name:'milliapi_llms_txt_check',description:'Qualified llms.txt inspection.',method:'GET',path:'/api/llms-txt-check?url={url}',priceUsd:0.001,inputSchema:urlInput}),
      tool({name:'milliapi_verify_repairs',description:'Fresh verification of repairs against a prior baseline.',method:'POST',path:'/api/verify-site-repairs',priceUsd:0.002,inputSchema:{type:'object',properties:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},required:['url','baselineToken'],additionalProperties:false},bodyTemplate:{url:'{url}',baselineToken:'{baselineToken}'}}),
      tool({name:'milliapi_readiness_change',description:'Compare current readiness with a prior baseline.',method:'POST',path:'/api/site-readiness-change',priceUsd:0.003,inputSchema:{type:'object',properties:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},required:['url','baselineToken'],additionalProperties:false},bodyTemplate:{url:'{url}',baselineToken:'{baselineToken}'}}),
      tool({name:'milliapi_web_readiness_batch',description:'Audit and rank up to five public sites in one purchase.',method:'POST',path:'/api/agent-web-audit-batch',priceUsd:0.02,inputSchema:{type:'object',properties:{urls:{type:'array',minItems:1,maxItems:5,items:{type:'string',format:'uri'}}},required:['urls'],additionalProperties:false},bodyTemplate:{urls:'{urls}'}})
    ],
    adapters:{langchain:{status:'ready-to-wrap'},llamaindex:{status:'ready-to-wrap'},mcp:{status:'shipped',endpoint:`${API}/api/mcp`,alias:`${API}/mcp`,transport:'streamable-http',quoteOnly:true}},
    retrySafety:{header:'Idempotency-Key',scope:'best-effort response replay; shared across instances when the operator configures a shared store'}
  });
}
