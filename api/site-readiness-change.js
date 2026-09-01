import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { registerLearningHooks } from './lib/learning-graph.js';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { idempotencyMiddleware } from './lib/idempotency.js';
import { auditPublicUrl, decodeBaselineToken, compareWithBaseline } from './lib/web-readiness-core.js';
import { buildRepairArtifacts } from './lib/repair-artifacts.js';

const NETWORK='eip155:8453';
const PRICE='$0.003';
const ROUTE='/api/site-readiness-change';
const PUBLIC_ORIGIN='https://milliapi.com';
const PAY_TO=process.env.PAY_TO||'';
const PAYMENT_CONFIGURED=Boolean(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET);

const discoveryExtension=declareDiscoveryExtension({
  input:{url:'https://example.com',baselineToken:'<token returned by a prior AI Web Readiness Audit>'},
  inputSchema:{properties:{url:{type:'string',format:'uri'},baselineToken:{type:'string',description:'Portable baseline token returned by a prior /api/agent-web-audit or batch result.'}},required:['url','baselineToken']},
  output:{example:{product:'MilliAPI Site Readiness Change',changed:true,scoreDelta:10,verdict:{before:'needs_work',after:'mostly_ready'},changes:[{id:'llms.present',before:false,after:true}]},schema:{type:'object',properties:{product:{type:'string'},changed:{type:'boolean'},scoreDelta:{type:'number'},verdict:{type:'object'},changes:{type:'array'},current:{type:'object'},nextBaselineToken:{type:'string'}},required:['product','changed','scoreDelta','verdict','changes','current','nextBaselineToken']}}
});

async function changeHandler(req,res){
  const url=req.body?.url; const token=req.body?.baselineToken;
  if(typeof url!=='string'||typeof token!=='string') return res.status(400).json({error:'JSON body must contain url and baselineToken'});
  try{
    const baseline=decodeBaselineToken(token);
    const current=await auditPublicUrl(url);
    const baselineHost=new URL(baseline.target).hostname.toLowerCase();
    const currentHost=new URL(current.target).hostname.toLowerCase();
    if(baselineHost!==currentHost) return res.status(409).json({error:'Baseline token belongs to a different hostname',baselineTarget:baseline.target,currentTarget:current.target});
    const comparison=compareWithBaseline(current,baseline);
    return res.status(200).json({
      product:'MilliAPI Site Readiness Change',version:2,target:current.target,...comparison,
      current:{score:current.score,verdict:current.verdict,summary:current.summary,topRecommendations:(current.recommendations||[]).slice(0,3),repairArtifacts:buildRepairArtifacts(current)},
      nextBaselineToken:current.baselineToken,
      pricing:{protocol:'x402',pricePerCallUsd:0.003,currency:'USDC',network:'Base'}
    });
  }catch(error){return res.status(400).json({error:error?.message||'Change detection failed'});}
}

const app=express(); app.disable('x-powered-by'); app.set('trust proxy',true); app.use(express.json({limit:'20kb'}));
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, Idempotency-Key');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Idempotent-Replay, X-Idempotency-Scope');res.setHeader('Cache-Control','private, no-store');next();});
app.options(ROUTE,(_req,res)=>res.status(204).end());
app.use(ROUTE,idempotencyMiddleware());
if(PAYMENT_CONFIGURED){
  const description='Compare a public site against a portable baseline from a prior MilliAPI readiness audit. Returns score/verdict deltas, exact machine-readable changes, and current repair artifacts without requiring an account or server-side history store.';
  app.use(ROUTE,fastUnpaidChallenge({route:ROUTE,method:'POST',amount:3000,payTo:PAY_TO,description,serviceName:'MilliAPI',tags:['ai-agents','change-detection','history','web-audit','repair-artifacts'],iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}));
  const facilitator=createCdpFacilitatorClient();
  const resourceServer=registerLearningHooks(new x402ResourceServer(facilitator).register(NETWORK,new ExactEvmScheme()),{serviceId:'service:site_change',priceUsd:0.003});
  app.use(paymentMiddleware({[`POST ${ROUTE}`]:{accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description,mimeType:'application/json',serviceName:'MilliAPI',tags:['ai-agents','change-detection','history','web-audit','repair-artifacts'],iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discoveryExtension}}},resourceServer,{appName:'MilliAPI'}));
}else app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402_payment_configuration_incomplete'}));
app.post(ROUTE,changeHandler);
export default app;
