import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once, EventEmitter } from 'node:events';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { lazyX402PaymentMiddleware } from '../api/lib/lazy-x402-middleware.js';
import { observePaidRoute } from '../api/lib/privacy-traffic-telemetry.js';
const network='eip155:8453';
const routes={'GET /api/paid':{accepts:[{scheme:'exact',network,price:'$0.001',payTo:'0x1111111111111111111111111111111111111111'}]}};
test('root-mounted SDK blocks malformed payment before fulfillment',async()=>{
 const facilitator={getSupported:async()=>({kinds:[{x402Version:2,scheme:'exact',network}],extensions:[],signers:{}}),verify:async()=>({isValid:false,invalidReason:'test_invalid'}),settle:async()=>assert.fail('invalid payment must not settle')};
 const server=new x402ResourceServer(facilitator).register(network,new ExactEvmScheme());
 const app=express();let fulfilled=false;
 app.use(paymentMiddleware(routes,server));
 app.get('/api/paid',(_req,res)=>{fulfilled=true;res.json({paid:true});});
 const http=app.listen(0,'127.0.0.1');await once(http,'listening');
 try {const res=await fetch(`http://127.0.0.1:${http.address().port}/api/paid`,{headers:{'PAYMENT-SIGNATURE':'invalid'}});assert.equal(res.status,402);assert.equal(fulfilled,false);}finally{http.close();}
});
test('shared middleware fails closed if accidentally mounted on a path',()=>{
 const middleware=lazyX402PaymentMiddleware({routes,network});let error;
 middleware({baseUrl:'/api/paid'},{},e=>{error=e;});
 assert.match(error.message,/mounted at the app root/);
});
test('HTTP 200 without a settlement receipt is not settled telemetry',async t=>{
 const messages=[];t.mock.method(console,'log',line=>messages.push(JSON.parse(line)));
 const req={method:'GET',headers:{'payment-signature':'invalid'},get(n){return this.headers[n.toLowerCase()];}};
 const res=new EventEmitter();res.statusCode=200;res.getHeader=()=>undefined;
 await observePaidRoute(req,res,{route:'/api/paid',amount:'1000'});res.emit('finish');
 assert.equal(messages.at(-1).stage,'payment_attempt_failed');
});
