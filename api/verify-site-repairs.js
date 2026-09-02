import express from 'express';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { idempotencyMiddleware } from './lib/idempotency.js';
import { lazyX402PaymentMiddleware } from './lib/lazy-x402-middleware.js';
import { auditPublicUrl, decodeBaselineToken } from './lib/web-readiness-core.js';
import { buildRepairArtifacts } from './lib/repair-artifacts.js';

const NETWORK='eip155:8453';
const PRICE='$0.002';
const ROUTE='/api/verify-site-repairs';
const PUBLIC_ORIGIN='https://milliapi.com';
const PAY_TO=process.env.PAY_TO||'';
const PAYMENT_CONFIGURED=Boolean(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET);

const discoveryExtension=declareDiscoveryExtension({
  method:'POST',bodyType:'json',input:{url:'https://example.com',baselineToken:'<token returned by a prior AI Web Readiness Audit>'},
  inputSchema:{type:'object',properties:{url:{type:'string',format:'uri'},baselineToken:{type:'string',description:'Portable baseline token returned by a prior paid audit.'}},required:['url','baselineToken']},
  output:{example:{product:'MilliAPI Repair Verification',status:'partially_verified',scoreDelta:15,resolvedRecommendationIds:['add_canonical','publish_llms_txt'],remainingRecommendationIds:['add_structured_data'],introducedRecommendationIds:[],current:{score:75,verdict:'mostly_ready',summary:'Some recommended fixes are now resolved.'},nextBaselineToken:'<fresh portable baseline token>'},schema:{type:'object',properties:{product:{type:'string'},status:{type:'string'},scoreDelta:{type:'number'},resolvedRecommendationIds:{type:'array'},remainingRecommendationIds:{type:'array'},introducedRecommendationIds:{type:'array'},current:{type:'object'},nextBaselineToken:{type:'string'}},required:['product','status','scoreDelta','resolvedRecommendationIds','remainingRecommendationIds','introducedRecommendationIds','current','nextBaselineToken']}}
});

function verifyRepairs(current,baseline){
  const before=new Set(baseline?.recommendationIds||[]); const after=new Set((current?.recommendations||[]).map(item=>item.id));
  const resolvedRecommendationIds=[...before].filter(id=>!after.has(id)).sort(); const remainingRecommendationIds=[...before].filter(id=>after.has(id)).sort(); const introducedRecommendationIds=[...after].filter(id=>!before.has(id)).sort();
  const scoreDelta=Number(current?.score||0)-Number(baseline?.score||0); let status='unchanged';
  if(before.size===0) status=introducedRecommendationIds.length?'regressed':'nothing_to_verify'; else if(remainingRecommendationIds.length===0&&introducedRecommendationIds.length===0&&scoreDelta>=0) status='verified'; else if(resolvedRecommendationIds.length>0&&scoreDelta>=0) status='partially_verified'; else if(scoreDelta<0||introducedRecommendationIds.length>0) status='regressed';
  return {status,scoreDelta,resolvedRecommendationIds,remainingRecommendationIds,introducedRecommendationIds,baselineCheckedAt:baseline.checkedAt,currentCheckedAt:current.checkedAt};
}

async function verifyHandler(req,res){
  const url=req.body?.url; const token=req.body?.baselineToken; if(typeof url!=='string'||typeof token!=='string') return res.status(400).json({error:'JSON body must contain url and baselineToken'});
  try{
    const baseline=decodeBaselineToken(token); const current=await auditPublicUrl(url,{useCache:false}); const baselineHost=new URL(baseline.target).hostname.toLowerCase(); const currentHost=new URL(current.target).hostname.toLowerCase();
    if(baselineHost!==currentHost) return res.status(409).json({error:'Baseline token belongs to a different hostname',baselineTarget:baseline.target,currentTarget:current.target});
    const verification=verifyRepairs(current,baseline);
    return res.status(200).json({product:'MilliAPI Repair Verification',version:1,target:current.target,...verification,current:{score:current.score,verdict:current.verdict,summary:current.summary,remainingRecommendations:current.recommendations||[],repairArtifacts:buildRepairArtifacts(current)},nextBaselineToken:current.baselineToken,pricing:{protocol:'x402',pricePerCallUsd:0.002,currency:'USDC',network:'Base'}});
  }catch(error){return res.status(400).json({error:error?.message||'Repair verification failed'});}
}

const app=express(); app.disable('x-powered-by'); app.set('trust proxy',true); app.use(express.json({limit:'20kb'}));
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, X-PAYMENT-SIGNATURE, Idempotency-Key');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Idempotent-Replay, X-Idempotency-Scope');res.setHeader('Cache-Control','private, no-store');next();});
app.options(ROUTE,(_req,res)=>res.status(204).end()); app.use(ROUTE,idempotencyMiddleware());

if(PAYMENT_CONFIGURED){
  const description='Verify whether fixes recommended by a prior MilliAPI audit actually resolved the observed readiness issues. Performs a fresh uncached audit and returns resolved, remaining, and newly introduced findings plus current repair artifacts and a fresh baseline.'; const tags=['ai-agents','repair-verification','web-audit','repeat-buyers','repair-artifacts'];
  app.use(ROUTE,fastUnpaidChallenge({route:ROUTE,method:'POST',amount:2000,payTo:PAY_TO,description,serviceName:'MilliAPI',tags,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}));
  app.use(ROUTE,lazyX402PaymentMiddleware({routes:{[`POST ${ROUTE}`]:{accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description,mimeType:'application/json',serviceName:'MilliAPI',tags,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}},network:NETWORK,serviceId:'service:repair_verify',priceUsd:0.002,paywallConfig:{appName:'MilliAPI'}}));
}else app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402_payment_configuration_incomplete'}));
app.post(ROUTE,verifyHandler); export default app;
