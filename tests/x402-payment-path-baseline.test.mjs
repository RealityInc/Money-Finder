import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePaymentRequiredHeader, PAYMENT_REQUIRED_HEADER_BUDGET_BYTES } from '../api/lib/x402-challenge-header.js';
import { protectExpressSettlementResponse, SETTLEMENT_FAILURE_REASON } from '../api/lib/x402-settlement-failure.js';
import { requestedX402Version, toV1PaymentRequired } from '../api/lib/x402-version.js';
import { clientKind, uaFamily } from '../api/lib/client-classification.js';

function richChallenge() {
  return {
    x402Version:2,
    error:'Payment required',
    resource:{url:'https://milliapi.com/api/audit-and-fix?url=https%3A%2F%2Fexample.com',description:'Decision-ready audit',mimeType:'application/json'},
    accepts:[{scheme:'exact',network:'eip155:8453',amount:'5000',asset:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',payTo:'0x1111111111111111111111111111111111111111',maxTimeoutSeconds:300}],
    preview:{example:'x'.repeat(12000)},
    buyerFlow:{notes:'y'.repeat(8000)},
    extensions:{bazaar:{info:{description:'z'.repeat(8000)}}},
  };
}

test('PAYMENT-REQUIRED header stays bounded while retaining payable terms', () => {
  const encoded=encodePaymentRequiredHeader(richChallenge());
  assert.ok(encoded.length <= PAYMENT_REQUIRED_HEADER_BUDGET_BYTES);
  const decoded=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
  assert.equal(decoded.x402Version,2);
  assert.equal(decoded.accepts[0].amount,'5000');
  assert.equal(decoded.resource.url.includes('milliapi.com'),true);
  assert.equal(decoded.extensions,undefined);
  assert.equal(decoded.preview,undefined);
});

test('explicit v1 clients receive v1-compatible payment terms', () => {
  const req={
    originalUrl:'/api/audit-and-fix?url=https%3A%2F%2Fexample.com&x402Version=1',
    headers:{},
    get(){ return null; },
  };
  assert.equal(requestedX402Version(req).version,1);
  const v1=toV1PaymentRequired(richChallenge(),{
    resourceUrl:'https://milliapi.com/api/audit-and-fix?url=https%3A%2F%2Fexample.com',
    description:'Decision-ready audit',
  });
  assert.equal(v1.x402Version,1);
  assert.equal(v1.accepts[0].network,'base');
  assert.equal(v1.accepts[0].maxAmountRequired,'5000');
  assert.equal(v1.accepts[0].amount,undefined);
});

test('x402 in a crawler user-agent is not buyer evidence', () => {
  assert.equal(uaFamily('x402scan/1.0 crawler'),'x402-ua-mention');
  assert.equal(clientKind('x402scan/1.0 crawler',false),'indexer');
  assert.equal(clientKind('x402scan/1.0 crawler',true),'buyer');
});

function context({receipt=null}={}) {
  const headers=new Map();
  if(receipt) headers.set('payment-response',receipt);
  const req={
    headers:{'x-payment':'signed-payment'},
    get(name){ return this.headers[String(name).toLowerCase()] || null; },
    protocol:'https', originalUrl:'/api/audit-and-fix?url=https%3A%2F%2Fexample.com',
  };
  const res={
    statusCode:500,
    headersSent:false,
    body:null,
    setHeader(name,value){ headers.set(String(name).toLowerCase(),String(value)); },
    getHeader(name){ return headers.get(String(name).toLowerCase()) || null; },
    send(body){ this.body=body; this.headersSent=true; return this; },
  };
  return {req,res,headers};
}

test('opaque post-signature failure reports unknown charge state without returning 402', () => {
  const {req,res}=context();
  protectExpressSettlementResponse(req,res,{route:'/api/audit-and-fix',priceUsd:0.005});
  res.send('{"error":"Internal Server Error"}');
  assert.equal(res.statusCode,500);
  assert.equal(res.getHeader('X-Charged'),'null');
  assert.equal(res.getHeader('PAYMENT-REQUIRED'),null);
  const body=JSON.parse(res.body);
  assert.equal(body.error,'settlement_failed');
  assert.equal(body.charged,null);
  assert.equal(body.retryable,false);
});

test('a settlement failure records why it failed, not just that it did', () => {
  // Two intermittent settlement failures in production produced no diagnostic signal at all: the
  // telemetry event carried route, status and amount but never the reason, and the reason reached
  // only the buyer. An intermittent fault that leaves no evidence can be investigated only by paying
  // to reproduce it, so the classification has to survive on the response for the telemetry hook.
  const {req,res}=context();
  protectExpressSettlementResponse(req,res,{route:'/api/page-metadata',priceUsd:0.002});
  res.send('{"error":"facilitator unavailable"}');

  const reason = res[SETTLEMENT_FAILURE_REASON];
  assert.ok(reason, 'the failure classification must be readable by the telemetry hook');
  assert.equal(reason.settlementStatus,'settlement_failed');
  assert.equal(reason.charged,null);
  assert.match(reason.detail,/facilitator unavailable/);
});

test('a settled-but-undelivered failure records the charged classification too', () => {
  const {req,res}=context({receipt:'receipt-123'});
  protectExpressSettlementResponse(req,res,{route:'/api/page-metadata',priceUsd:0.002});
  res.send('{"error":"handler exploded after settlement"}');
  const reason = res[SETTLEMENT_FAILURE_REASON];
  assert.equal(reason.settlementStatus,'settled_but_undelivered');
  assert.equal(reason.charged,true,'a charged failure must be distinguishable in the record');
});

test('receipt on a failed paid request reports settled-but-undelivered', () => {
  const {req,res}=context({receipt:'receipt-123'});
  protectExpressSettlementResponse(req,res,{route:'/api/audit-and-fix',priceUsd:0.005});
  res.send('{"error":"Internal Server Error"}');
  assert.equal(res.statusCode,502);
  assert.equal(res.getHeader('X-Charged'),'true');
  const body=JSON.parse(res.body);
  assert.equal(body.error,'settled_but_undelivered');
  assert.equal(body.charged,true);
  assert.match(body.buyerGuidance,/Do not pay again/i);
});
