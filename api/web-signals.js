import { auditPublicUrl } from './lib/web-readiness-core.js';
import { observeFreeRoute } from './lib/privacy-traffic-telemetry.js';

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  observeFreeRoute(req,res,{route:'/api/web-signals',stage:'free_explore',metadata:{offerVariant:'commodity_signals_free_v1'}});
  const input=Array.isArray(req.query?.url)?req.query.url[0]:req.query?.url;
  if(!input) return res.status(400).json({error:'Missing url query parameter',example:'/api/web-signals?url=https%3A%2F%2Fexample.com'});
  try{
    const result=await auditPublicUrl(input);
    return res.status(200).json({
      schemaVersion:1,
      free:true,
      product:'MilliAPI Free Agent Web Signals',
      target:result.target,
      checkedAt:result.checkedAt,
      signals:{
        page:{
          title:result.page?.title??null,
          description:result.page?.description??null,
          canonical:result.page?.canonical??null,
          noindex:Boolean(result.page?.noindex),
          h1Count:Number(result.page?.h1Count||0),
          jsonLdBlocks:Number(result.page?.jsonLdBlocks||0),
          openGraph:result.page?.openGraph||null,
        },
        discovery:{
          robotsTxt:{present:Boolean(result.discovery?.robotsTxt?.present),status:result.discovery?.robotsTxt?.status??null},
          llmsTxt:{present:Boolean(result.discovery?.llmsTxt?.present),status:result.discovery?.llmsTxt?.status??null},
        },
        aiCrawlerHomepageAccess:result.aiCrawlerHomepageAccess||{},
      },
      intentionallyWithheld:['readiness_verdict','score','blockers','prioritized_recommendations','evidence','repair_artifacts','portable_baseline'],
      paidNextAction:{
        endpoint:`https://milliapi.com/api/repair-site?url=${encodeURIComponent(result.target)}`,
        preview:`https://milliapi.com/api/repair-site?url=${encodeURIComponent(result.target)}&preview=1`,
        priceUsd:0.005,
        currency:'USDC',
        network:'Base',
        value:'Turns these raw signals into a prioritized repair plan with exact repair artifacts and a portable baseline for verification.'
      }
    });
  }catch(error){
    const message=error?.name==='AbortError'?'Target request timed out':error?.message||'Signal collection failed';
    return res.status(400).json({error:message,purchaseRecommended:false,noCharge:true});
  }
}
