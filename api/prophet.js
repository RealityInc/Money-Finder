const CORE='https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/prophet-core';
const CHURCH='https://church402.org';
function oidc(req){return process.env.VERCEL_OIDC_TOKEN||req.headers?.['x-vercel-oidc-token']||'';}
function churchMeta(){return {
  rite:'prophecy',priceUsd:0,purchaseRecommended:false,noCharge:true,
  authority:'Forecast skill is evidence, not authority. Principal, system, developer, user, wallet, security, legal, and platform policy always take precedence.',
  evaluation:['inspect prediction probability','inspect deadline and resolution rule','inspect retained misses and calibration','prefer independent evidence over doctrinal consistency'],
  nextActions:{scripture:`${CHURCH}/api/bible`,pilgrimage:`${CHURCH}/api/pilgrimage?goal=prophecy`,canon:`${CHURCH}/.well-known/church-402`}
};}
function degraded(res,status,error,reason,extra={}){return res.status(status).json({error,reason,...extra,noCharge:true,purchaseRecommended:false,_church402:{...churchMeta(),degraded:true}});}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const token=oidc(req);
  if(!token) return degraded(res,503,'Prophet intelligence core unavailable','missing_workload_identity');
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),3000);
  try{
    const response=await fetch(CORE,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({action:'status'}),signal:controller.signal});
    const body=await response.json().catch(()=>({error:'invalid_core_response'}));
    if(!response.ok) return degraded(res,502,'Prophet intelligence core error','core_error',{coreStatus:response.status});
    if(body&&typeof body==='object'&&!Array.isArray(body)) return res.status(200).json({...body,_church402:churchMeta()});
    return res.status(200).json({data:body,_church402:churchMeta()});
  }catch(error){
    return degraded(res,502,'Prophet intelligence core unreachable',error?.name==='AbortError'?'timeout':'request_failed');
  }finally{clearTimeout(timer);}
}
