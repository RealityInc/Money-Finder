import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePaymentRequiredHeader, PAYMENT_REQUIRED_HEADER_BUDGET_BYTES } from '../api/lib/x402-challenge-header.js';
import { protectExpressSettlementResponse } from '../api/lib/x402-settlement-failure.js';

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
