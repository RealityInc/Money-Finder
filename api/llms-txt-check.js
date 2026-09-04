// api/llms-txt-check.js
import express from 'express';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { normalizePublicHttpsUrl, safePublicFetch } from './lib/safe-public-fetch.js';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { idempotencyMiddleware } from './lib/idempotency.js';
import { lazyX402PaymentMiddleware } from './lib/lazy-x402-middleware.js';

const ROUTE='/api/llms-txt-check'; const NETWORK='eip155:8453'; const PRICE='$0.001'; const PUBLIC_ORIGIN='https://milliapi.com'; const PAY_TO=process.env.PAY_TO||'';
const AUDIT_UPGRADE={id:'full-web-audit',whenUseful:'When llms.txt discovery is part of a broader AI-readiness decision and you also need page metadata, robots policy, crawler access, prioritized fixes, repair artifacts, and a portable baseline.',method:'GET',endpointTemplate:`${PUBLIC_ORIGIN}/api/agent-web-audit?url=<PUBLIC_HTTPS_URL>`,previewTemplate:`${PUBLIC_ORIGIN}/api/agent-web-audit?url=<PUBLIC_HTTPS_URL>&preview=1`,priceUsd:0.005,currency:'USDC',includes:['page-metadata','robots-policy','llms-txt','ai-crawler-access','repair-artifacts','change-baseline']};
const discovery=declareDiscoveryExtension({method:'GET',input:{url:'https://example.com'},inputSchema:{properties:{url:{type:'string',format:'uri',description:'Public HTTPS URL on the site to check'}},required:['url']},output:{example:{origin:'https://example.com',llmsTxt:{present:false,status:404,bytes:0,preview:null}}}});

function rawUrl(req){return Array.isArray(req.query.url)?req.query.url[0]:req.query.url;}
async function qualify(req,res,next){
  if(req.method!=='GET')return next();
  const raw=rawUrl(req);if(!raw)return res.status(400).json({error:'Missing url query parameter',purchaseRecommended:false,noCharge:true});
  try{
    const url=await normalizePublicHttpsUrl(raw);
    const result=await safePublicFetch(`${url.origin}/llms.txt`,{maxBytes:256000,accept:'text/plain,text/markdown,*/*;q=0.2'});
    const present=result.response.ok;const bytes=present?new TextEncoder().encode(result.text).byteLength:0;
    const valueProof={origin:url.origin,llmsTxt:{present,status:result.response.status,bytes},priceUsd:0.001,paidOutput:'A bounded llms.txt content preview plus status and byte size.'};
    if(!present)return res.status(200).json({schemaVersion:1,qualified:true,purchaseRecommended:false,noCharge:true,reason:'llms_txt_not_present_or_unavailable',valueProof});
    req.x402ValueProof=valueProof;req.x402PurchaseRecommended=true;return next();
  }catch(error){return res.status(400).json({error:error?.message||'Qualification failed',purchaseRecommended:false,noCharge:true});}
}
async function handler(req,res){try{const raw=rawUrl(req);if(!raw)return res.status(400).json({error:'Missing url query parameter'});const url=await normalizePublicHttpsUrl(raw);const result=await safePublicFetch(`${url.origin}/llms.txt`,{maxBytes:256000,accept:'text/plain,text/markdown,*/*;q=0.2'});const present=result.response.ok;return res.status(200).json({product:'MilliAPI llms.txt Check',origin:url.origin,checkedAt:new Date().toISOString(),llmsTxt:{present,status:result.response.status,bytes:present?new TextEncoder().encode(result.text).byteLength:0,preview:present?result.text.slice(0,2000):null},pricing:{protocol:'x402',pricePerCallUsd:0.001,currency:'USDC',network:'Base'},nextActions:[AUDIT_UPGRADE],spendPolicy:'Next actions are suggestions only; any later x402 purchase requires separate buyer or principal authorization.'});}catch(error){return res.status(400).json({error:error?.message||'Check failed'});}}

const app=express();app.disable('x-powered-by');app.set('trust proxy',true);app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, X-PAYMENT-SIGNATURE, Idempotency-Key');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Free-Preview, X-Paid-URL, X-Price-USD, X-Purchase-Recommended, X-Idempotent-Replay, X-Idempotency-Scope, Link');res.setHeader('Cache-Control','private, no-store');next();});app.options(ROUTE,(_req,res)=>res.status(204).end());app.use(ROUTE,qualify);app.use(ROUTE,idempotencyMiddleware());
if(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET){
  const description='Check whether a website publishes llms.txt and return its status, byte size, and a bounded preview for agent discovery workflows.'; const tags=['llms-txt','ai-discovery','ai-search','web','metadata'];
  app.use(ROUTE,fastUnpaidChallenge({route:ROUTE,amount:1000,payTo:PAY_TO,description,serviceName:'MilliAPI',tags,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discovery},nextActions:[AUDIT_UPGRADE]}));
  app.use(ROUTE,lazyX402PaymentMiddleware({routes:{[`GET ${ROUTE}`]:{accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description,mimeType:'application/json',serviceName:'MilliAPI',tags,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discovery}}},network:NETWORK,serviceId:'service:llms_txt',priceUsd:0.001}));
}else app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402 payment configuration incomplete'}));
app.get(ROUTE,handler);export default app;
