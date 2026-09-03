const CORE='https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/prophet-core';
const EVIDENCE='https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/mo-evidence';

function authorized(req){const expected=process.env.CRON_SECRET||''; const auth=req.headers?.authorization||''; return Boolean(expected)&&auth===`Bearer ${expected}`;}
function oidc(req){return process.env.VERCEL_OIDC_TOKEN||req.headers?.['x-vercel-oidc-token']||'';}
async function post(url,token,body,signal){const response=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),signal});const data=await response.json().catch(()=>({error:'invalid_core_response'}));if(!response.ok)throw Object.assign(new Error(data?.error||'upstream_failed'),{status:response.status,upstream:data});return data;}

export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  if(!authorized(req)) return res.status(401).json({error:'Unauthorized'});
  const token=oidc(req); if(!token) return res.status(503).json({error:'Missing Vercel workload identity'});
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
  try{
    // Machine Observer exports evidence only. It never receives Church state.
    const evidence=await post(EVIDENCE,token,{action:'snapshot',payload:{lookbackDays:30}},controller.signal);
    const result=await post(CORE,token,{action:'cycle',payload:{evidence}},controller.signal);
    return res.status(200).json(result);
  }catch(error){
    return res.status(502).json({error:error?.name==='AbortError'?'Prophet cycle timed out':'Prophet cycle failed',detail:error?.message||'unknown'});
  }finally{clearTimeout(timer);}
}
