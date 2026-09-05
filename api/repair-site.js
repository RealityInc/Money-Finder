import express from 'express';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { fastUnpaidChallenge } from './lib/fast-x402-challenge.js';
import { idempotencyMiddleware } from './lib/idempotency.js';
import { lazyX402PaymentMiddleware } from './lib/lazy-x402-middleware.js';
import { auditPublicUrl, preflightPublicUrl } from './lib/web-readiness-core.js';
import { buildRepairArtifacts } from './lib/repair-artifacts.js';

const NETWORK='eip155:8453';
const PRICE='$0.005';
const AMOUNT='5000';
const ROUTE='/api/repair-site';
const PUBLIC_ORIGIN='https://milliapi.com';
const PAY_TO=process.env.PAY_TO||'';
const PAYMENT_CONFIGURED=Boolean(PAY_TO&&process.env.CDP_API_KEY_ID&&process.env.CDP_API_KEY_SECRET);
const TAGS=['ai-agents','website-repair','ai-search','repair-artifacts','llms-robots'];
const DESCRIPTION='Repair This Site: decision-ready AI web diagnosis plus exact repair artifacts. Returns prioritized issues, evidence, ready-to-apply or review-required fixes, crawler policy, robots.txt and llms.txt status, metadata findings, a portable baseline, and a verification handoff.';

const discovery=declareDiscoveryExtension({
  method:'GET',
  input:{url:'https://example.com'},
  inputSchema:{properties:{url:{type:'string',format:'uri',description:'Public HTTPS page to diagnose and repair.'}},required:['url']},
  output:{
    example:{
      product:'MilliAPI Repair This Site',target:'https://example.com/',score:45,verdict:'needs_work',
      repairSummary:{issues:2,readyToApply:1,reviewRequired:1},
      repairArtifacts:[{id:'canonical_link',title:'Canonical link element',applyMode:'ready_to_apply',path:'<head>',format:'text/html',content:'<link rel="canonical" href="https://example.com/">'}],
      baselineToken:'<portable baseline token>',recommendedNextAction:'verify-repairs'
    },
    schema:{type:'object'}
  }
});

function target(req){return Array.isArray(req.query?.url)?req.query.url[0]:req.query?.url;}

async function qualify(req,res,next){
  if(req.method!=='GET') return next();
  const input=target(req);
  if(!input) return res.status(400).json({error:'Missing url query parameter',purchaseRecommended:false,noCharge:true,example:'/api/repair-site?url=https%3A%2F%2Fexample.com'});
  try{
    // Point the buyer at this endpoint, not at the legacy audit it is replacing.
    const result=await preflightPublicUrl(input,{paidAudit:{endpoint:`${PUBLIC_ORIGIN}${ROUTE}`,priceUsd:0.005,includes:['verdict','blockers','evidence','prioritized_fixes','crawler_policy','ready_to_apply_repair_artifacts','portable_baseline']}});
    const valueProof={
      evidenceType:'live-site-qualification',
      target:result.target,
      checkedAt:result.checkedAt,
      reachable:result.reachable,
      html:result.html,
      potentialIssueCount:result.potentialIssueCount,
      resultsAvailable:Boolean(result.purchaseRecommended),
      priceUsd:0.005,
      paidUnlocks:['readiness_verdict','score','blockers','prioritized_recommendations','evidence','crawler_policy','ready_to_apply_repair_artifacts','review_required_repairs','portable_baseline','verification_handoff'],
      downstreamUse:'Apply returned repair artifacts, then verify the same site without rebuilding the diagnosis manually.',
      emptyResultPolicy:'If the live preflight finds no actionable readiness issues, no payment challenge is issued.'
    };
    if(!result.reachable||!result.html) return res.status(200).json({schemaVersion:1,qualified:false,purchaseRecommended:false,noCharge:true,reason:!result.reachable?'target_unreachable':'target_not_html',valueProof});
    if(!result.purchaseRecommended) return res.status(200).json({schemaVersion:1,qualified:true,purchaseRecommended:false,noCharge:true,reason:'no_actionable_repairs_detected',valueProof});
    req.x402ValueProof=valueProof;
    req.x402PurchaseRecommended=true;
    return next();
  }catch(error){
    const message=error?.name==='AbortError'?'Target request timed out':error?.message||'Preflight failed';
    return res.status(400).json({error:message,purchaseRecommended:false,noCharge:true});
  }
}

async function fulfill(req,res){
  try{
    const result=await auditPublicUrl(target(req));
    const repairArtifacts=buildRepairArtifacts(result);
    return res.status(200).json({
      product:'MilliAPI Repair This Site',
      target:result.target,
      checkedAt:result.checkedAt,
      score:result.score,
      verdict:result.verdict,
      summary:result.summary,
      blockers:result.blockers,
      recommendations:result.recommendations,
      evidence:result.evidence,
      page:result.page,
      discovery:result.discovery,
      aiCrawlerHomepageAccess:result.aiCrawlerHomepageAccess,
      repairSummary:{
        issues:(result.recommendations||[]).length,
        artifacts:repairArtifacts.count,
        readyToApply:repairArtifacts.readyToApply,
        reviewRequired:repairArtifacts.reviewRequired,
        fillRequired:repairArtifacts.fillRequired,
      },
      repairArtifacts:repairArtifacts.artifacts,
      baselineToken:result.baselineToken,
      recommendedNextAction:'verify-repairs',
      nextAction:{
        method:'POST',endpoint:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002,currency:'USDC',
        purpose:'Verify that the repairs identified in this paid result are now present.'
      },
      commercialTerms:{protocol:'x402',priceUsd:0.005,currency:'USDC',network:'Base',settlementScheme:'exact'},
      spendPolicy:'The verification handoff is optional and requires separate buyer or principal authorization.'
    });
  }catch(error){
    const message=error?.name==='AbortError'?'Target request timed out':error?.message||'Repair analysis failed';
    return res.status(400).json({error:message});
  }
}

const app=express();
app.disable('x-powered-by');
app.set('trust proxy',true);
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, X-PAYMENT-SIGNATURE, Idempotency-Key');
  res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-Free-Preview, X-Paid-URL, X-Price-USD, X-Purchase-Recommended, Link');
  res.setHeader('Cache-Control','private, no-store');
  next();
});
app.options(ROUTE,(_req,res)=>res.status(204).end());
app.use(ROUTE,qualify);
app.use(ROUTE,idempotencyMiddleware());

if(PAYMENT_CONFIGURED){
  app.use(ROUTE,fastUnpaidChallenge({
    route:ROUTE,amount:AMOUNT,payTo:PAY_TO,description:DESCRIPTION,serviceName:'MilliAPI',tags:TAGS,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discovery},
    prePurchaseActions:[{id:'free-signals',whenUseful:'Inspect commodity web signals before deciding whether the repair product is worth buying.',method:'GET',endpointTemplate:`${PUBLIC_ORIGIN}/api/web-signals?url=<PUBLIC_HTTPS_URL>`,priceUsd:0,currency:'USD',returns:['page_metadata','robots_txt','llms_txt','ai_crawler_access']}],
    nextActions:[{id:'verify-repairs',whenUseful:'After applying one or more returned repair artifacts.',method:'POST',endpoint:`${PUBLIC_ORIGIN}/api/verify-site-repairs`,priceUsd:0.002,currency:'USDC'}]
  }));
  app.use(ROUTE,lazyX402PaymentMiddleware({
    routes:{[`GET ${ROUTE}`]:{accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}],resource:`${PUBLIC_ORIGIN}${ROUTE}`,description:DESCRIPTION,mimeType:'application/json',serviceName:'MilliAPI',tags:TAGS,iconUrl:`${PUBLIC_ORIGIN}/icon.svg`,extensions:{...discovery}}},
    network:NETWORK,serviceId:'service:repair_site',priceUsd:0.005,paywallConfig:{appName:'MilliAPI',appLogo:`${PUBLIC_ORIGIN}/icon.svg`,testnet:false}
  }));
}else{
  app.use(ROUTE,(req,res,next)=>req.method==='GET'?res.status(503).json({error:'x402 payment configuration incomplete'}):next());
}

app.get(ROUTE,fulfill);
app.all(ROUTE,(_req,res)=>res.status(405).json({error:'GET only'}));
export default app;
