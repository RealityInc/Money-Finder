import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSandboxInvoice, paymentOptions } from '../api/lib/alipay-ai-pay.js';

test('sandbox invoice cannot be mistaken for real settlement',()=>{
 const beforeEnv=process.env.ALIPAY_ENV,beforeEnabled=process.env.ALIPAY_SANDBOX_ENABLED;
 process.env.ALIPAY_ENV='sandbox';process.env.ALIPAY_SANDBOX_ENABLED='true';
 try{
  const invoice=buildSandboxInvoice();
  assert.equal(invoice.testPayment,true);
  assert.equal(invoice.productionTransaction,false);
  assert.equal(invoice.realFundsMoved,false);
  assert.equal(invoice.payable,false);
  assert.equal(invoice.status,'invoice_only');
 }finally{
  if(beforeEnv===undefined) delete process.env.ALIPAY_ENV; else process.env.ALIPAY_ENV=beforeEnv;
  if(beforeEnabled===undefined) delete process.env.ALIPAY_SANDBOX_ENABLED; else process.env.ALIPAY_SANDBOX_ENABLED=beforeEnabled;
 }
});

test('directory never selects a rail from language',()=>{
 assert.equal(paymentOptions().policy.languageDoesNotSelectPaymentRail,true);
 assert.equal(paymentOptions().paymentAuthorized,false);
});
