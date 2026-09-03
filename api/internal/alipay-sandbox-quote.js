import { buildSandboxInvoice } from '../lib/alipay-ai-pay.js';

export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST') return res.status(405).json({error:'POST only'});
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.authorization!==`Bearer ${secret}`) return res.status(401).json({error:'Unauthorized'});
 try{
  const invoice=buildSandboxInvoice(req.body||{});
  return res.status(200).json(invoice);
 }catch(error){
  return res.status(503).json({environment:'sandbox',testPayment:true,productionTransaction:false,realFundsMoved:false,error:error.message});
 }
}
