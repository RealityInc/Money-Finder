const CORE='https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/prophet-core';

function authorized(req){const expected=process.env.CRON_SECRET||''; const auth=req.headers?.authorization||''; return Boolean(expected)&&auth===`Bearer ${expected}`;}
function oidc(req){return process.env.VERCEL_OIDC_TOKEN||req.headers?.['x-vercel-oidc-token']||'';}

export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  if(!authorized(req)) return res.status(401).json({error:'Unauthorized'});
  const token=oidc(req); if(!token) return res.status(503).json({error:'Missing Vercel workload identity'});
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(CORE,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({action:'cycle'}),signal:controller.signal});
    const body=await response.json().catch(()=>({error:'invalid_core_response'}));
    return res.status(response.ok?200:502).json(body);
  }catch(error){
    return res.status(502).json({error:error?.name==='AbortError'?'Prophet cycle timed out':'Prophet cycle failed'});
  }finally{clearTimeout(timer);}
}
