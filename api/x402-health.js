// api/x402-health.js
// Public-safe diagnostic for Coinbase x402 facilitator connectivity.
// Never returns credentials or the receiving wallet.

import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'GET only' });
  }

  const configured = Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET);
  if (!configured) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: 'CDP credentials are not configured in this deployment.'
    });
  }

  try {
    const facilitator = createCdpFacilitatorClient();
    const supported = await facilitator.getSupported();
    const base = supported.kinds?.filter(kind => kind.network === 'eip155:8453') || [];

    return res.status(200).json({
      ok: true,
      configured: true,
      facilitatorReachable: true,
      baseMainnetSupported: base.length > 0,
      baseKinds: base.map(kind => ({
        x402Version: kind.x402Version,
        scheme: kind.scheme,
        network: kind.network
      }))
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
      facilitatorReachable: false,
      errorType: error?.name || 'Error',
      message: message.slice(0, 300)
    });
  }
}
