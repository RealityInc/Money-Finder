import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { registerLearningHooks } from './lib/learning-graph.js';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { auditPublicUrl } from './lib/web-readiness-core.js';

const NETWORK='eip155:8453';
const PRICE='$0.020';
const ROUTE='/api/agent-web-audit-batch';
const PUBLIC_ORIGIN='https://milliapi.com';
const PAY_TO=process.env.PAY_TO||'';
const PAYMENT_CONFIGURED=Boolean(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET);
const MAX_URLS=5;

const discoveryExtension=declareDiscoveryExtension({
  input:{urls:['https://example.com','https://example.org']},
  inputSchema:{properties:{urls:{type:'array',minItems:1,maxItems:MAX_URLS,items:{type:'string',format:'uri'},description:'One to five public HTTPS pages.'}},required:['urls']},
  output:{
    example:{product:'MilliAPI AI Web Readiness Batch',checkedAt:'2026-09-01T00:00:00.000Z',requested:2,succeeded:2,failed:0,results:[{target:'https://example.com/',score:80,verdict:'mostly_ready'}]},
    schema:{type:'object',properties:{product:{type:'string'},checkedAt:{type:'string'},requested:{type:'integer'},succeeded:{type:'integer'},failed:{type:'integer'},summary:{type:'object'},results:{type:'array'}},required:['product','checkedAt','requested','succeeded','failed','summary','results']}
  }
});

async function batchHandler(req,res){
  const urls=Array.isArray(req.body?.urls)?req.body.urls:[];
  if(!urls.length||urls.length>MAX_URLS) return res.status(400).json({error:`Provide 1-${MAX_URLS} URLs in JSON body`,example:{urls:['https://example.com']}});
  const unique=[...new Set(urls.map(String))];
  const settled=await Promise.all(unique.map(async url=>{
    try { const audit=await auditPublicUrl(url); return {ok:true,...audit}; }
    catch(error){ return {ok:false,target:url,error:error?.message||'Audit failed'}; }
  }));
  const successes=settled.filter(x=>x.ok); const failures=settled.filter(x=>!x.ok);
  const severity={blocked:0,needs_work:1,mostly_ready:2,ready:3};
  successes.sort((a,b)=>(severity[a.verdict]??9)-(severity[b.verdict]??9)||a.score-b.score);
  const verdictCounts={ready:0,mostly_ready:0,needs_work:0,blocked:0};
  for(const item of successes) if(item.verdict in verdictCounts) verdictCounts[item.verdict]+=1;
  return res.status(200).json({
    product:'MilliAPI AI Web Readiness Batch',version:1,checkedAt:new Date().toISOString(),requested:unique.length,succeeded:successes.length,failed:failures.length,
    summary:{...verdictCounts,attentionFirst:successes.slice(0,3).map(x=>({target:x.target,verdict:x.verdict,score:x.score,topFix:x.recommendations?.[0]?.id||null}))},
    results:[...successes,...failures],pricing:{protocol:'x402',pricePerBatchUsd:0.02,maxUrls:MAX_URLS,currency:'USDC',network:'Base',effectiveMaxPerUrlUsd:0.004}
  });
}

const app=express(); app.disable('x-powered-by'); app.set('trust proxy',true); app.use(express.json({limit:'20kb'}));
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE');res.setHeader('Cache-Control','private, no-store');next();});
app.options(ROUTE,(_req,res)=>res.status(204).end());

if(PAYMENT_CONFIGURED){
  const description='Audit up to five public websites in one x402 purchase. Returns ranked readiness verdicts, blockers, evidence, prioritized fixes, and portable baselines; designed for prospect lists, crawl queues, and portfolios.';
  app.use(ROUTE,fastUnpaidChallenge({route:ROUTE,method:'POST',amount:20000,payTo:PAY_TO,description,serviceName:'MilliAPI',tags:['ai-agents','batch','web-audit','decision-ready'],iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}));
  const facilitator=createCdpFacilitatorClient();
  const resourceServer=registerLearningHooks(new x402ResourceServer(facilitator).register(NETWORK,new ExactEvmScheme()),{serviceId:'service:web_audit_batch',priceUsd:0.02});
  app.use(paymentMiddleware({[`POST ${ROUTE}`]:{accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description,mimeType:'application/json',serviceName:'MilliAPI',tags:['ai-agents','batch','web-audit','decision-ready'],iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}},resourceServer,{appName:'MilliAPI'}));
}else{
  app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402_payment_configuration_incomplete'}));
}
app.post(ROUTE,batchHandler);
export default app;
