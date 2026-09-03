const CORE_URL = 'https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/mo-core';

export async function persistIntelligenceEvent(req, event, { timeoutMs = 500 } = {}) {
  const token = process.env.VERCEL_OIDC_TOKEN || req.get?.('x-vercel-oidc-token') || req.headers?.['x-vercel-oidc-token'] || '';
  if (!token) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(CORE_URL, {
      method:'POST',
      headers:{
        authorization:`Bearer ${token}`,
        'content-type':'application/json',
      },
      body:JSON.stringify({ action:'ingest_event', payload:{ ...event, vertical:'api-data-economy' } }),
      signal:controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
