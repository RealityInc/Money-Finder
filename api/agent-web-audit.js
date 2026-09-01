// api/agent-web-audit.js
// Paid decision-ready AI web-readiness audit. x402 settles $0.005 USDC on Base.

import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { registerLearningHooks } from './lib/learning-graph.js';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { idempotencyMiddleware } from './lib/idempotency.js';
import { auditPublicUrl } from './lib/web-readiness-core.js';
import { buildRepairArtifacts } from './lib/repair-artifacts.js';

const NETWORK='eip155:8453';
const PRICE='$0.005';
const ROUTE='/api/agent-web-audit';
const PUBLIC_ORIGIN='https://milliapi.com';
const PAY_TO=process.env.PAY_TO||'';
const PAYMENT_CONFIGURED=Boolean(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET);

const discoveryExtension=declareDiscoveryExtension({
  input:{url:'https://example.com'},
  inputSchema:{properties:{url:{type:'string',format:'uri',description:'Public HTTPS page to audit. Private IPs, localhost, credentials, and non-standard ports are rejected.'}},required:['url']},
  output:{
    example:{
      product:'MilliAPI AI Web Readiness Audit',target:'https://example.com/',checkedAt:'2026-09-01T00:00:00.000Z',score:45,verdict:'needs_work',
      agentRecommendation:'improve_before_prioritizing_discovery',summary:'No blocking issue detected. Improvements are prioritized below.',blockers:[],
      recommendations:[{id:'add_canonical',priority:'high',issue:'No canonical URL was detected.',action:'Add a canonical link element.',evidence:'canonical missing'}],
      evidence:[],checksBundled:['page_metadata','robots_txt','llms_txt','major_ai_crawler_homepage_access'],
      repairArtifacts:{count:1,readyToApply:1,reviewRequired:0,fillRequired:0,artifacts:[{id:'canonical_link',recommendationId:'add_canonical',title:'Canonical link element',path:'<head>',format:'text/html',applyMode:'ready_to_apply',content:'<link rel="canonical" href="https://example.com/">'}]},
      baselineToken:'<portable baseline token for future change detection>',cache:{hit:false,scope:'best_effort_warm_runtime',ttlSeconds:600,ageSeconds:0},
      page:{title:'Example Domain',description:null,canonical:null,noindex:false,h1Count:1,jsonLdBlocks:0,openGraph:{title:null,description:null,image:null,type:null}},
      discovery:{robotsTxt:{present:false,status:404},llmsTxt:{present:false,status:404}},aiCrawlerHomepageAccess:{GPTBot:{allowed:true,reason:'No matching robots.txt group'}}
    },
    schema:{type:'object',properties:{product:{type:'string'},target:{type:'string'},checkedAt:{type:'string'},score:{type:'number',minimum:0,maximum:100},verdict:{type:'string',enum:['ready','mostly_ready','needs_work','blocked']},agentRecommendation:{type:'string'},summary:{type:'string'},blockers:{type:'array'},recommendations:{type:'array'},evidence:{type:'array'},checksBundled:{type:'array'},repairArtifacts:{type:'object'},baselineToken:{type:'string'},cache:{type:'object'},page:{type:'object'},discovery:{type:'object'},aiCrawlerHomepageAccess:{type:'object'},pricing:{type:'object'}},required:['product','target','checkedAt','score','verdict','agentRecommendation','summary','blockers','recommendations','evidence','checksBundled','repairArtifacts','baselineToken','page','discovery','aiCrawlerHomepageAccess']}
  }
});

async function auditHandler(req,res){
  const target=Array.isArray(req.query?.url)?req.query.url[0]:req.query?.url;
  if(!target) return res.status(400).json({error:'Missing url query parameter',example:'/api/agent-web-audit?url=https%3A%2F%2Fexample.com'});
  try{
    const result=await auditPublicUrl(target);
    const repairArtifacts=buildRepairArtifacts(result);
    return res.status(200).json({...result,repairArtifacts,pricing:{protocol:'x402',pricePerCallUsd:0.005,currency:'USDC',network:'Base',paymentActive:true}});
  }catch(error){
    const message=error?.name==='AbortError'?'Target request timed out':error?.message||'Audit failed';
    return res.status(400).json({error:message});
  }
}

const app=express();
app.disable('x-powered-by');
app.set('trust proxy',true);
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, Idempotency-Key');
  res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Idempotent-Replay, X-Idempotency-Scope');
  res.setHeader('Cache-Control','private, no-store');
  next();
});
app.options(ROUTE,(_req,res)=>res.status(204).end());
app.use(ROUTE,idempotencyMiddleware());

if(PAYMENT_CONFIGURED){
  const description='Decision-ready AI web audit in one paid call. Returns a readiness verdict, blocking issues, evidence, ready-to-apply or review-required repair artifacts, prioritized fixes, 0-100 score, crawler policy, robots.txt and llms.txt status, canonical/indexability, Open Graph, JSON-LD, headings, major AI-crawler access, and a portable baseline for future change detection.';
  app.use(ROUTE,fastUnpaidChallenge({route:ROUTE,amount:5000,payTo:PAY_TO,description,serviceName:'MilliAPI',tags:['ai-agents','web-audit','ai-search','robots','llms-txt','change-baseline','repair-artifacts'],iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}));
  const facilitator=createCdpFacilitatorClient();
  const resourceServer=registerLearningHooks(new x402ResourceServer(facilitator).register(NETWORK,new ExactEvmScheme()),{serviceId:'service:web_audit',priceUsd:0.005});
  app.use(paymentMiddleware({[`GET ${ROUTE}`]:{
    accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description,mimeType:'application/json',serviceName:'MilliAPI',
    tags:['ai-agents','web-audit','ai-search','robots','llms-txt','change-baseline','repair-artifacts'],iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}
  }},resourceServer,{appName:'MilliAPI',appLogo:`${PUBLIC_ORIGIN}/icon.svg`,testnet:false}));
}else{
  app.use(ROUTE,(req,res,next)=>{
    if(req.method!=='GET') return next();
    return res.status(503).json({error:'x402 payment configuration incomplete',missing:[!PAY_TO?'PAY_TO':null,!process.env.CDP_API_KEY_ID?'CDP_API_KEY_ID':null,!process.env.CDP_API_KEY_SECRET?'CDP_API_KEY_SECRET':null].filter(Boolean)});
  });
}

app.get(ROUTE,auditHandler);
app.all(ROUTE,(_req,res)=>res.status(405).json({error:'GET only'}));
export default app;
