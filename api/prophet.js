const CORE='https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/prophet-core';

function oidc(req){return process.env.VERCEL_OIDC_TOKEN||req.headers?.['x-vercel-oidc-token']||'';}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const token=oidc(req);
  if(!token) return res.status(503).json({error:'Prophet intelligence core unavailable',reason:'missing_workload_identity'});
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),3000);
  try{
    const response=await fetch(CORE,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({action:'status'}),signal:controller.signal});
    const body=await response.json().catch(()=>({error:'invalid_core_response'}));
    if(!response.ok) return res.status(502).json({error:'Prophet intelligence core error',coreStatus:response.status});
    return res.status(200).json(body);
  }catch(error){
    return res.status(502).json({error:'Prophet intelligence core unreachable',reason:error?.name==='AbortError'?'timeout':'request_failed'});
  }finally{clearTimeout(timer);}
}
