import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { registerLearningHooks } from './learning-graph.js';
import { attachPrivateSettlementFeed, withIntelligenceRequest } from './private-settlement-feed.js';
import { explainExpressSettlementError, protectExpressSettlementResponse } from './x402-settlement-failure.js';

// Fast 402 challenges run before this middleware, so unpaid discovery traffic never
// needs to contact the facilitator. The underlying x402 middleware is constructed
// once, on the first request that actually carries a payment authorization, and is
// then reused for the lifetime of the warm serverless instance.
export function lazyX402PaymentMiddleware({ routes, network, serviceId, priceUsd, paywallConfig }) {
  let middleware = null;
  const routeKey=Object.keys(routes||{}).find(key=>/^GET\s+/i.test(key))||Object.keys(routes||{})[0]||serviceId;
  const route=String(routeKey).replace(/^[A-Z]+\s+/,'');

  return function deferredPaymentMiddleware(req, res, next) {
    // Once a payment authorization is present, any 5xx must tell the buyer whether a settlement
    // receipt exists and must never masquerade as a fresh 402 challenge.
    protectExpressSettlementResponse(req,res,{route,priceUsd});

    if (!middleware) {
      const facilitator = createCdpFacilitatorClient();
      const baseServer = registerLearningHooks(
        new x402ResourceServer(facilitator).register(network, new ExactEvmScheme()),
        { serviceId, priceUsd },
      );
      const resourceServer = attachPrivateSettlementFeed(baseServer,{route,serviceId,priceUsd});
      middleware = paymentMiddleware(routes, resourceServer, paywallConfig);
    }

    try {
      const result=withIntelligenceRequest(req,()=>middleware(req, res, next));
      if(result && typeof result.then==='function') {
        return result.catch((error)=>{
          if(explainExpressSettlementError(req,res,error,{route,priceUsd})) return;
          throw error;
        });
      }
      return result;
    } catch(error) {
      if(explainExpressSettlementError(req,res,error,{route,priceUsd})) return;
      throw error;
    }
  };
}
