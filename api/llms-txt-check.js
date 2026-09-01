// api/llms-txt-check.js
import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { normalizePublicHttpsUrl, safePublicFetch } from './lib/safe-public-fetch.js';
import { registerLearningHooks } from './lib/learning-graph.js';

const ROUTE='/api/llms-txt-check';
const NETWORK='eip155:8453';
const PRICE='$0.001';
const PUBLIC_ORIGIN='https://milliapi.com';
const PAY_TO=process.env.PAY_TO||'';
const discovery=declareDiscoveryExtension({
  method:'GET',
  input:{url:'https://example.com'},
  inputSchema:{properties:{url:{type:'string',format:'uri',description:'Public HTTPS URL on the site to check'}},required:['url']},
  output:{example:{origin:'https://example.com',llmsTxt:{present:false,status:404,bytes:0,preview:null}}}
});

async function handler(req,res){
  try{
    const raw=Array.isArray(req.query.url)?req.query.url[0]:req.query.url;
    if(!raw)return res.status(400).json({error:'Missing url query parameter'});
    const url=await normalizePublicHttpsUrl(raw);
    const result=await safePublicFetch(`${url.origin}/llms.txt`,{maxBytes:256000,accept:'text/plain,text/markdown,*/*;q=0.2'});
    const present=result.response.ok;
    return res.status(200).json({
      product:'MilliAPI llms.txt Check',
      origin:url.origin,
      checkedAt:new Date().toISOString(),
      llmsTxt:{present,status:result.response.status,bytes:present?new TextEncoder().encode(result.text).byteLength:0,preview:present?result.text.slice(0,2000):null},
      pricing:{protocol:'x402',pricePerCallUsd:0.001,currency:'USDC',network:'Base'}
    });
  }catch(error){return res.status(400).json({error:error?.message||'Check failed'});}
}

const app=express();
app.disable('x-powered-by');
app.set('trust proxy',true);
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE');res.setHeader('Cache-Control','private, no-store');next();});
app.options(ROUTE,(_req,res)=>res.status(204).end());
if(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET){
  const server=registerLearningHooks(
    new x402ResourceServer(createCdpFacilitatorClient()).register(NETWORK,new ExactEvmScheme()),
    {serviceId:'service:llms_txt',priceUsd:0.001}
  );
  app.use(paymentMiddleware({
    [`GET ${ROUTE}`]:{
      accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],
      resource:`${PUBLIC_ORIGIN}${ROUTE}`,
      description:'Check whether a website publishes llms.txt and return its status, byte size, and a bounded preview for agent discovery workflows.',
      mimeType:'application/json',
      serviceName:'MilliAPI',
      tags:['llms-txt','ai-discovery','ai-search','web','metadata'],
      iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,
      extensions:{...discovery}
    }
  },server));
}else app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402 payment configuration incomplete'}));
app.get(ROUTE,handler);
export default app;
