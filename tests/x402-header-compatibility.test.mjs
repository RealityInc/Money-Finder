import test from 'node:test';
import assert from 'node:assert/strict';
import { x402HTTPResourceServer, x402ResourceServer } from '@x402/core/server';
import { parsePaymentRequired } from '@x402/core/schemas';
import { declareDiscoveryExtension, bazaarResourceServerExtension } from '@x402/extensions/bazaar';
import { fastUnpaidChallenge, normalizePaymentHeader } from '../api/lib/fast-x402-challenge.js';

const payload={x402Version:2,accepted:{scheme:'exact',network:'eip155:8453',amount:'1000',asset:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',payTo:'0x1111111111111111111111111111111111111111',maxTimeoutSeconds:300},payload:{signature:'0x'+'00'.repeat(65)}};
const encoded=Buffer.from(JSON.stringify(payload)).toString('base64');
const sdk=new x402HTTPResourceServer(new x402ResourceServer([]),{});
function request(headers={},method='GET'){
 return {method,originalUrl:'/api/example?url=https%3A%2F%2Fexample.com',query:{},headers:Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v])),get(n){return this.headers[n.toLowerCase()];}};
}
for(const name of ['PAYMENT-SIGNATURE','X-PAYMENT','X-PAYMENT-SIGNATURE']){
 test(`${name} reaches the real SDK without changing payload bytes`,()=>{
  const req=request({[name]:encoded,'Idempotency-Key':'test-key-123'});normalizePaymentHeader(req);
  assert.equal(req.get('PAYMENT-SIGNATURE'),encoded);assert.equal(req.get('Idempotency-Key'),'test-key-123');
  assert.deepEqual(sdk.extractPayment({getHeader:n=>req.get(n)}),payload);
 });
}
test('canonical header wins and unsigned requests remain unsigned',()=>{
 const req=request({'PAYMENT-SIGNATURE':encoded,'X-PAYMENT':'different'});normalizePaymentHeader(req);assert.equal(req.get('PAYMENT-SIGNATURE'),encoded);
 const unsigned=request();normalizePaymentHeader(unsigned);assert.equal(unsigned.get('PAYMENT-SIGNATURE'),undefined);
});
for(const method of ['GET','POST']){
 test(`${method} challenge schema and extension echo remain compatible`,async t=>{
  t.mock.method(globalThis,'fetch',async()=>{assert.fail('offline regression attempted network access');});
  const discovery=declareDiscoveryExtension({input:{url:'https://example.com'},inputSchema:{properties:{url:{type:'string'}}},output:{example:{ok:true},schema:{type:'object'}}});
  const req=request({},method);
  const res={headers:{},setHeader(n,v){this.headers[n]=v;},status(n){this.statusCode=n;return this;},json(b){this.body=b;return this;}};
  await fastUnpaidChallenge({route:'/api/example',amount:1000,payTo:payload.accepted.payTo,description:'Example audit',method,tags:['audit','web'],extensions:discovery})(req,res,()=>assert.fail('unpaid request skipped challenge'));
  assert.equal(res.statusCode,402);assert.equal(parsePaymentRequired(res.body).success,true);
  const server=new x402ResourceServer([]).registerExtension(bazaarResourceServerExtension);
  const extensions=server.enrichExtensions(discovery,{method,path:'/api/example',adapter:{getMethod:()=>method}});
  assert.deepEqual(server.validateExtensions({x402Version:2,accepts:res.body.accepts,extensions},{...payload,extensions:res.body.extensions}),{valid:true});
 });
}
