import test from 'node:test';
import assert from 'node:assert/strict';
import {x402ResourceServer,x402HTTPResourceServer} from '@x402/express';
import {ExactEvmScheme} from '@x402/evm/exact/server';
import {initializedX402Middleware} from '../api/lib/initialized-x402-middleware.js';
import {protectExpressSettlementResponse,SETTLEMENT_FAILURE_REASON} from '../api/lib/x402-settlement-failure.js';
const network='eip155:8453';
function context(){
 const headers=new Map();
 const req={method:'GET',path:'/api/paid',url:'/api/paid',originalUrl:'/api/paid',protocol:'https',header(n){return this.get(n);},headers:{'payment-signature':'unsigned-fixture'},get(n){return this.headers[n.toLowerCase()]||null;}};
 const res={statusCode:200,headersSent:false,setHeader(n,v){headers.set(n.toLowerCase(),String(v));},getHeader(n){return headers.get(n.toLowerCase());},status(n){this.statusCode=n;return this;},json(b){return this.send(JSON.stringify(b));},send(b){this.body=b;this.headersSent=true;return this;},end(b){return this.send(b);}};
 protectExpressSettlementResponse(req,res,{route:'/api/paid',priceUsd:0.001});return {req,res};
}
test('pinned SDK initialization fails before verify/settle/handler and later initialization recovers',async()=>{
 let supported=0,verify=0,settle=0,handler=0;
 const facilitator={getSupported:async()=>{if(++supported===1)throw new Error('arbitrary dependency error');return {kinds:[{x402Version:2,scheme:'exact',network}],extensions:[],signers:{}};},verify:async()=>{verify++;return {isValid:false};},settle:async()=>{settle++;assert.fail('no valid payment fixture');}};
 const server=new x402ResourceServer(facilitator).register(network,new ExactEvmScheme());
 const http=new x402HTTPResourceServer(server,{'GET /api/paid':{accepts:[{scheme:'exact',network,price:'$0.001',payTo:'0x1111111111111111111111111111111111111111'}]}});
 const middleware=initializedX402Middleware(http,undefined,{route:'/api/paid',priceUsd:0.001});
 const first=context();await middleware(first.req,first.res,()=>{handler++;});
 assert.equal(first.res.statusCode,503);assert.equal(first.res.getHeader('X-Charged'),'false');assert.equal(JSON.parse(first.res.body).noCharge,true);assert.equal(first.res[SETTLEMENT_FAILURE_REASON].paymentPhase,'initialization_failed_before_verification');assert.deepEqual({supported,verify,settle,handler},{supported:1,verify:0,settle:0,handler:0});
 const second=context();await middleware(second.req,second.res,()=>{handler++;});
 assert.equal(supported,2);assert.equal(second.res.statusCode,402);assert.equal(second.res.getHeader('X-Charged'),undefined);assert.equal(settle,0);assert.equal(handler,0);
 const third=context();await middleware(third.req,third.res,()=>{handler++;});assert.equal(supported,2);
});
test('dependency wording after pipeline entry is still unknown, never an unpaid retry',async()=>{
 const http={routes:{},server:{hasExtension:()=>true},initialize:async()=>{},requiresPayment:()=>true,processHTTPRequest:async()=>{throw new Error('facilitator supported fetch failed');}};
 const middleware=initializedX402Middleware(http,undefined,{route:'/api/paid'});const {req,res}=context();
 const log=console.error;console.error=()=>{};try{await middleware(req,res,()=>assert.fail('must not fulfill'));}finally{console.error=log;}
 assert.equal(res.statusCode,500);assert.equal(res.getHeader('X-Charged'),'null');assert.equal(JSON.parse(res.body).noCharge,false);assert.equal(res[SETTLEMENT_FAILURE_REASON].paymentPhase,'unknown');
});
