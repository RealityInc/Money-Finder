export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' });
  try {
    const mod = await import('@x402/extensions/bazaar');
    return res.status(200).json({
      ok: true,
      bazaarResourceServerExtension: Boolean(mod?.bazaarResourceServerExtension),
      validateBazaarRouteExtensions: typeof mod?.validateBazaarRouteExtensions === 'function'
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
