import { runMilliSteward } from './lib/steward.js';
export default async function handler(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Cache-Control','no-store');
res.setHeader('X-Agent-Payment-Authorization','false');
if(req.method!=='GET')return res.status(405).json({error:'GET only'});
try{return res.status(200).json(await runMilliSteward(req));}
catch(error){console.error('MILLI_STEWARD_FAILED',error);return res.status(503).json({ok:false,status:'red',role:'MILLI-STEWARD',error:'steward_unavailable'});}
}
