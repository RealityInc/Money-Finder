import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { registerLearningHooks } from './learning-graph.js';
import { attachPrivateSettlementFeed, withIntelligenceRequest } from './private-settlement-feed.js';
import { guardSettlementFailure } from './x402-settlement-failure.js';

// Fast 402 challenges run before this middleware, so unpaid discovery traffic never
// needs to contact the facilitator. The underlying x402 middleware is constructed
// once, on the first request that actually carries a payment authorization, and is
// then reused for the lifetime of the warm serverless instance.
export function lazyX402PaymentMiddleware({ routes, network, serviceId, priceUsd, paywallConfig }) {
  let middleware = null;
  let paidResourceServer = null;
  const routeKey=Object.keys(routes||{}).find(key=>/^GET\s+/i.test(key))||Object.keys(routes||{})[0]||serviceId;
  const route=String(routeKey).replace(/^[A-Z]+\s+/,'');
  const resourceUrl=routes?.[routeKey]?.resource||null;

  return function deferredPaymentMiddleware(req, res, next) {
    if (!middleware) {
      const facilitator = createCdpFacilitatorClient();
      const baseServer = registerLearningHooks(
        new x402ResourceServer(facilitator).register(network, new ExactEvmScheme()),
        { serviceId, priceUsd },
      );
      const resourceServer = attachPrivateSettlementFeed(baseServer,{route,serviceId,priceUsd});
      paidResourceServer = resourceServer;
      middleware = paymentMiddleware(routes, resourceServer, paywallConfig);
    }
    // A buyer that has already signed must never receive the middleware's opaque 500. The guard is
    // installed before the middleware runs because the middleware writes to res and returns nothing,
    // so there is no response object to inspect afterwards.
    guardSettlementFailure(req, res, { resourceServer:paidResourceServer, network, route, priceUsd, retryUrl:resourceUrl });
    return withIntelligenceRequest(req,()=>middleware(req, res, next));
  };
}
