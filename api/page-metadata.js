// api/page-metadata.js
import express from 'express';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { normalizePublicHttpsUrl, safePublicFetch } from './lib/safe-public-fetch.js';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { lazyX402PaymentMiddleware } from './lib/lazy-x402-middleware.js';

const ROUTE='/api/page-metadata'; const NETWORK='eip155:8453'; const PRICE='$0.002'; const PUBLIC_ORIGIN='https://milliapi.com'; const PAY_TO=process.env.PAY_TO||'';
const AUDIT_UPGRADE={id:'full-web-audit',whenUseful:'When metadata is part of a broader AI-readiness decision and you also need robots.txt, llms.txt, crawler access, prioritized fixes, repair artifacts, and a portable baseline.',method:'GET',endpointTemplate:`${PUBLIC_ORIGIN}/api/agent-web-audit?url=<PUBLIC_HTTPS_URL>`,previewTemplate:`${PUBLIC_ORIGIN}/api/agent-web-audit?url=<PUBLIC_HTTPS_URL>&preview=1`,priceUsd:0.005,currency:'USDC',includes:['page-metadata','robots-policy','llms-txt','ai-crawler-access','repair-artifacts','change-baseline']};
function match(html,regex){return html.match(regex)?.[1]?.trim()||null;}
function entities(v){return v?.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')||v;}
function meta(html,key,attr='name'){const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return entities(match(html,new RegExp(`<meta[^>]+${attr}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,'i'))||match(html,new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${escaped}["'][^>]*>`,'i')));}
function link(html,rel){const escaped=rel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return entities(match(html,new RegExp(`<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>`,'i'))||match(html,new RegExp(`<link[^>]+href=["']([^"']*)["'][^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]*>`,'i')));}

const discovery=declareDiscoveryExtension({method:'GET',input:{url:'https://example.com'},inputSchema:{properties:{url:{type:'string',format:'uri',description:'Public HTTPS page to inspect'}},required:['url']},output:{example:{target:'https://example.com/',title:'Example Domain',description:null,canonical:null,openGraph:{title:null,description:null,image:null,type:null},h1Count:1,jsonLdBlocks:0}}});
function rawUrl(req){return Array.isArray(req.query.url)?req.query.url[0]:req.query.url;}
async function qualify(req,res,next){
  if(req.method!=='GET')return next();
  const raw=rawUrl(req);
  if(!raw)return res.status(400).json({error:'Missing url query parameter',purchaseRecommended:false,noCharge:true});
  try{
    const normalized=await normalizePublicHttpsUrl(raw);
    const result=await safePublicFetch(normalized.toString(),{maxBytes:1000000});
    const type=result.response.headers.get('content-type')||'';
    const html=/text\/html|application\/xhtml\+xml/i.test(type);
    const valueProof={target:result.finalUrl,reachable:true,status:result.response.status,html,contentType:type||null,priceUsd:0.002,paidOutputFields:['title','description','canonical','metaRobots','openGraph','h1Count','jsonLdBlocks']};
    if(!result.response.ok)return res.status(200).json({schemaVersion:1,qualified:false,purchaseRecommended:false,noCharge:true,reason:'target_http_error',valueProof});
    if(!html)return res.status(200).json({schemaVersion:1,qualified:false,purchaseRecommended:false,noCharge:true,reason:'target_not_html',valueProof});
    req.x402ValueProof=valueProof;req.x402PurchaseRecommended=true;return next();
  }catch(error){return res.status(400).json({error:error?.message||'Qualification failed',purchaseRecommended:false,noCharge:true});}
}
async function handler(req,res){try{const raw=rawUrl(req);if(!raw)return res.status(400).json({error:'Missing url query parameter'});const normalized=await normalizePublicHttpsUrl(raw);const result=await safePublicFetch(normalized.toString(),{maxBytes:1000000});if(!result.response.ok)return res.status(422).json({error:`Target returned HTTP ${result.response.status}`});const type=result.response.headers.get('content-type')||'';if(!/text\/html|application\/xhtml\+xml/i.test(type))return res.status(422).json({error:`Target is not HTML (${type||'unknown'})`});const html=result.text;const rawCanonical=link(html,'canonical');let canonical=rawCanonical;try{if(rawCanonical)canonical=new URL(rawCanonical,result.finalUrl).toString();}catch{}return res.status(200).json({product:'MilliAPI Page Metadata Extractor',target:result.finalUrl,checkedAt:new Date().toISOString(),title:entities(match(html,/<title[^>]*>([\s\S]*?)<\/title>/i)),description:meta(html,'description'),canonical,metaRobots:meta(html,'robots'),openGraph:{title:meta(html,'og:title','property'),description:meta(html,'og:description','property'),image:meta(html,'og:image','property'),type:meta(html,'og:type','property')},h1Count:(html.match(/<h1(?:\s|>)/gi)||[]).length,jsonLdBlocks:(html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi)||[]).length,pricing:{protocol:'x402',pricePerCallUsd:0.002,currency:'USDC',network:'Base'},nextActions:[AUDIT_UPGRADE],spendPolicy:'Next actions are suggestions only; any later x402 purchase requires separate buyer or principal authorization.'});}catch(error){return res.status(400).json({error:error?.message||'Extraction failed'});}}

const app=express();app.disable('x-powered-by');app.set('trust proxy',true);app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, X-PAYMENT-SIGNATURE');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Free-Preview, X-Paid-URL, X-Price-USD, X-Purchase-Recommended, Link');res.setHeader('Cache-Control','private, no-store');next();});app.options(ROUTE,(_req,res)=>res.status(204).end());app.use(ROUTE,qualify);
if(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET){
  const description='Extract title, description, canonical URL, robots meta, Open Graph, H1 count and JSON-LD count from a public HTTPS page.'; const tags=['metadata','open-graph','json-ld','seo','web'];
  app.use(ROUTE,fastUnpaidChallenge({route:ROUTE,amount:2000,payTo:PAY_TO,description,serviceName:'MilliAPI',tags,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discovery},nextActions:[AUDIT_UPGRADE]}));
  app.use(ROUTE,lazyX402PaymentMiddleware({routes:{[`GET ${ROUTE}`]:{accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description,mimeType:'application/json',serviceName:'MilliAPI',tags,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discovery}}},network:NETWORK,serviceId:'service:metadata',priceUsd:0.002}));
}else app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402 payment configuration incomplete'}));
app.get(ROUTE,handler);export default app;
