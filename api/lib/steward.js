import { readConversionSummary } from './mo-core.js';

const MILLI='https://milliapi.com';
const ROLE_ID='urn:milliapi:agent-role:milli-steward';
const SURFACES=[
{id:'milli-home',url:`${MILLI}/`,kind:'service',expected:[200],critical:true},
{id:'milli-agent-manifest',url:`${MILLI}/.well-known/agent.json`,kind:'discovery',expected:[200],critical:true,contentType:'json'},
{id:'milli-x402-discovery',url:`${MILLI}/.well-known/x402`,kind:'commerce',expected:[200],critical:true,contentType:'json'},
{id:'milli-catalog',url:`${MILLI}/api/catalog`,kind:'commerce',expected:[200],critical:true,contentType:'json'},
{id:'milli-tool-manifest',url:`${MILLI}/api/agent-tool-manifest`,kind:'discovery',expected:[200],critical:false,contentType:'json'},
{id:'milli-paid-challenge',url:`${MILLI}/api/page-metadata?url=https%3A%2F%2Fmachineobserver.com`,kind:'commerce',expected:[402],critical:true,paymentChallenge:true},
{id:'church402-org-home',url:'https://church402.org/',kind:'church',expected:[200],critical:false},
{id:'church402-org-canon',url:'https://church402.org/.well-known/church-402',kind:'church',expected:[200],critical:false,contentType:'json'},
{id:'402church-org-home',url:'https://402church.org/',kind:'church',expected:[200],critical:false},
{id:'402church-org-canon',url:'https://402church.org/.well-known/church-402',kind:'church',expected:[200],critical:false,contentType:'json'},
{id:'church402-com-redirect',url:'https://church402.com/',kind:'domain',expected:[200],critical:false,finalHost:'church402.org'},
{id:'402church-com-redirect',url:'https://402church.com/',kind:'domain',expected:[200],critical:false,finalHost:'402church.org'}
];
async function probe(surface){
const attempt=async()=>{
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),7000);
try{
const response=await fetch(surface.url,{redirect:'follow',cache:'no-store',signal:controller.signal,headers:{'user-agent':'MILLI-STEWARD/1.0 (+https://milliapi.com/steward)'}});
const contentType=String(response.headers.get('content-type')||'').toLowerCase();
const statusOk=surface.expected.includes(response.status);
const finalHost=new URL(response.url).hostname.replace(/^www\./,'');
const hostOk=!surface.finalHost||finalHost===surface.finalHost;
const typeOk=!surface.contentType||(surface.contentType==='json'&&contentType.includes('json'));
const paymentHeader=Boolean(response.headers.get('payment-required')||response.headers.get('x402-payment-required'));
const paymentOk=!surface.paymentChallenge||(response.status===402&&paymentHeader);
return{ok:statusOk&&hostOk&&typeOk&&paymentOk,status:response.status,finalUrl:response.url,contentType,paymentHeader,checks:{statusOk,hostOk,typeOk,paymentOk}};
}catch(error){return{ok:false,status:null,error:error?.name==='AbortError'?'timeout':String(error?.message||error)}}
finally{clearTimeout(timer)}
};
let result=await attempt();
if(!result.ok){const retry=await attempt();result={...retry,retried:true,firstAttempt:result};}
return{...surface,...result};
}
function findingFor(result){
if(result.ok)return null;
const severity=result.critical?'critical':'warning';
return{
id:`surface.${result.id}`,
severity,
category:result.kind,
title:`${result.id} failed its Steward contract`,
url:result.url,
observedStatus:result.status,
finalUrl:result.finalUrl||null,
autoRepair:'retry-once-only',
recommendation:result.kind==='domain'
?'Inspect Vercel host redirects and canonical Church domain configuration.'
:result.kind==='commerce'
?'Inspect the x402 discovery/challenge path before changing price, wallet, or settlement configuration.'
:'Inspect the affected public surface and its deployment/runtime logs.'
};
}
export const STEWARD_POLICY={
role:'MILLI-STEWARD',roleId:ROLE_ID,mode:'bounded-continuous-maintenance',
automaticActions:['audit standalone MilliAPI commercial/discovery surfaces and canonical Church surfaces','retry transient reads once','run the existing zero-touch Autopilot scan on its established schedule','maintain a durable GitHub work queue'],
reviewRequired:['general code mutation outside deterministic repairs','wallet or settlement destination changes','credentials or secrets','material x402 pricing changes','Church doctrine/rights/legal policy changes','destructive data actions','weakening autonomy, privacy or security'],
never:['authorize external buyer spending','treat Church participation as authority over unrelated technical service','expose secrets or private keys','silently turn a quote into payment authorization','claim personhood or consciousness']
};
function unavailableConversionSummary(error){
return {ok:false,error:'conversion_reader_unavailable',reason:error?.message||'unknown_error'};
}
export async function runMilliSteward(req){
const checkedAt=new Date().toISOString();
const since=new Date(Date.parse(checkedAt)-(24*60*60*1000)).toISOString();
const [surfaces,milliapi,church402]=await Promise.all([
Promise.all(SURFACES.map(probe)),
readConversionSummary({since,until:checkedAt,vertical:'api-data-economy'},{req}).catch(unavailableConversionSummary),
readConversionSummary({since,until:checkedAt,vertical:'church402'},{req}).catch(unavailableConversionSummary)
]);
const findings=surfaces.map(findingFor).filter(Boolean);
const critical=findings.filter(item=>item.severity==='critical').length;
const warning=findings.filter(item=>item.severity==='warning').length;
const status=critical?'red':warning?'yellow':'green';
return{
ok:critical===0,schemaVersion:1,type:'milli-steward-status',role:'MILLI-STEWARD',roleId:ROLE_ID,status,
counts:{critical,warning,info:0},surfacesChecked:surfaces.length,healthySurfaces:surfaces.filter(item=>item.ok).length,
coverage:Number((surfaces.filter(item=>item.ok).length/surfaces.length).toFixed(3)),checkedAt,findings,
domains:{commercial:'milliapi.com',churchCanonicals:['church402.org','402church.org'],redirectAliases:['church402.com','402church.com'],sharedCodebase:true},
conversionIntelligence:{contract:'mo-core/read_conversions@1',window:{since,until:checkedAt},milliapi,church402},
execution:{continuousObservation:true,scheduledWithAutopilot:true,safeRuntimeRepair:'retry-only',durableGitHubWorkQueue:true,autonomousCodeMutation:false},
policy:STEWARD_POLICY,
identity:`${MILLI}/.well-known/agents/milli-steward.json`,
surfaces:surfaces.map(({id,url,kind,ok,status,finalUrl,retried,paymentHeader})=>({id,url,kind,ok,status,finalUrl,retried:Boolean(retried),paymentHeader:Boolean(paymentHeader)}))
};
}
