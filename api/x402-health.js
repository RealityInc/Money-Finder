// api/x402-health.js
// Public-safe diagnostic for Coinbase x402 facilitator connectivity and route initialization.
// Never returns credentials or the receiving wallet.

import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { x402ResourceServer, x402HTTPResourceServer } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

const NETWORK = 'eip155:8453';
const PRICE = '$0.005';
const ROUTE = '/api/agent-web-audit';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'GET only' });
  }

  const payTo = process.env.PAY_TO || '';
  const configured = Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET);
  const payToShapeValid = /^0x[a-fA-F0-9]{40}$/.test(payTo.trim());

  if (!configured) {
    return res.status(503).json({
      ok: false,
      configured: false,
      payToConfigured: Boolean(payTo),
      payToShapeValid,
      error: 'CDP credentials are not configured in this deployment.'
    });
  }

  try {
    const facilitator = createCdpFacilitatorClient();
    const facilitatorStarted = Date.now();
    const supported = await facilitator.getSupported();
    const facilitatorLatencyMs = Date.now() - facilitatorStarted;
    const base = supported.kinds?.filter(kind => kind.network === NETWORK) || [];

    let routeInitialization = { ok: false, message: 'Not attempted', latencyMs: null };
    try {
      const resourceServer = new x402ResourceServer(facilitator)
        .register(NETWORK, new ExactEvmScheme());
      const httpServer = new x402HTTPResourceServer(resourceServer, {
        [`GET ${ROUTE}`]: {
          accepts: [{
            scheme: 'exact',
            price: PRICE,
            network: NETWORK,
            payTo: payTo.trim()
          }],
          description: 'AI web readiness audit',
          mimeType: 'application/json'
        }
      });
      const initStarted = Date.now();
      await httpServer.initialize();
      routeInitialization = { ok: true, message: 'Route initialized successfully', latencyMs: Date.now() - initStarted };
    } catch (routeError) {
      routeInitialization = {
        ok: false,
        message: (routeError instanceof Error ? routeError.message : String(routeError)).slice(0, 500),
        latencyMs: null
      };
      console.error('x402 route initialization failed:', routeInitialization.message);
    }

    const latencyWarning = facilitatorLatencyMs > 5000 || Number(routeInitialization.latencyMs || 0) > 5000;
    return res.status(routeInitialization.ok ? 200 : 502).json({
      ok: routeInitialization.ok,
      configured: true,
      payToConfigured: Boolean(payTo),
      payToShapeValid,
      facilitatorReachable: true,
      facilitatorLatencyMs,
      latencyWarning,
      baseMainnetSupported: base.length > 0,
      baseKinds: base.map(kind => ({
        x402Version: kind.x402Version,
        scheme: kind.scheme,
        network: kind.network
      })),
      routeInitialization
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('x402 facilitator health check failed:', {
      name: error?.name,
      message
    });

    return res.status(502).json({
      ok: false,
      configured: true,
      payToConfigured: Boolean(payTo),
      payToShapeValid,
      facilitatorReachable: false,
      errorType: error?.name || 'Error',
      message: message.slice(0, 300)
    });
  }
}
