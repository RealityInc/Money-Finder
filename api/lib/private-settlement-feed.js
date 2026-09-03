import { AsyncLocalStorage } from 'node:async_hooks';
import { persistIntelligenceEvent } from './mo-core.js';

const requestContext = new AsyncLocalStorage();

export function withIntelligenceRequest(req, fn) {
  return requestContext.run({ req }, fn);
}

export function attachPrivateSettlementFeed(resourceServer,{route,serviceId,priceUsd}) {
  if(!resourceServer?.onAfterSettle) return resourceServer;
  resourceServer.onAfterSettle(async context=>{
    if(context?.result?.success===false) return;
    const req=requestContext.getStore()?.req;
    if(!req) return;
    const amountAtomic=String(Math.max(0,Math.round(Number(priceUsd||0)*1_000_000)));
    await persistIntelligenceEvent(req,{
      telemetry:'x402_funnel_v1',
      service:'MilliAPI',
      at:new Date().toISOString(),
      route,
      stage:'settled',
      status:200,
      paymentAttempt:true,
      amount:amountAtomic,
      metadata:{endpointClass:serviceId},
    },{timeoutMs:1500});
  });
  return resourceServer;
}
