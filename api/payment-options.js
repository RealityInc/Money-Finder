import { paymentOptions } from './lib/alipay-ai-pay.js';
export default function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=1800');
 if(req.method!=='GET') return res.status(405).json({error:'GET only'});
 return res.status(200).json(paymentOptions());
}
