import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { registerLearningHooks } from './learning-graph.js';

// Fast 402 challenges run before this middleware, so unpaid discovery traffic never
// needs to contact the facilitator. The underlying x402 middleware is constructed
// once, on the first request that actually carries a payment authorization, and is
// then reused for the lifetime of the warm serverless instance.
export function lazyX402PaymentMiddleware({ routes, network, serviceId, priceUsd, paywallConfig }) {
  let middleware = null;

  return function deferredPaymentMiddleware(req, res, next) {
    if (!middleware) {
      const facilitator = createCdpFacilitatorClient();
      const resourceServer = registerLearningHooks(
        new x402ResourceServer(facilitator).register(network, new ExactEvmScheme()),
        { serviceId, priceUsd },
      );
      middleware = paymentMiddleware(routes, resourceServer, paywallConfig);
    }
    return middleware(req, res, next);
  };
}
