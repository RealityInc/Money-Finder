const CORE_URL = 'https://yhpcavjoyxcdaibvndyf.supabase.co/functions/v1/mo-core';

function oidcToken(req) {
  return process.env.VERCEL_OIDC_TOKEN || req?.get?.('x-vercel-oidc-token') || req?.headers?.['x-vercel-oidc-token'] || '';
}

async function coreRequest(action, payload, { req, timeoutMs = 8000 } = {}) {
  const token = oidcToken(req);
  if (!token) throw new Error('mo_core_oidc_unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(CORE_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      const error = new Error(body?.error || `mo_core_http_${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function persistIntelligenceEvent(req, event, { timeoutMs = 500 } = {}) {
  try {
    await coreRequest('ingest_event', { ...event, vertical: event?.vertical || 'api-data-economy' }, { req, timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function readConversionSummary(payload = {}, { req, timeoutMs = 8000, maxPages = 20 } = {}) {
  let cursor = null;
  let matchedEvents = 0;
  let pages = 0;
  const stages = {};
  const routes = {};
  let revenueUsd = 0;
  let returnedEvents = 0;

  do {
    const page = await coreRequest('read_conversions', { ...payload, limit: 500, cursor }, { req, timeoutMs });
    matchedEvents = page.matchedEvents;
    for (const event of page.events || []) {
      returnedEvents += 1;
      stages[event.stage] = (stages[event.stage] || 0) + 1;
      routes[event.route] = (routes[event.route] || 0) + 1;
      if (event.stage === 'settled') revenueUsd += Number(event.amount_usd || 0);
    }
    cursor = page.page?.nextCursor || null;
    pages += 1;
  } while (cursor && pages < maxPages);

  const attempts = (stages.payment_attempt_started || 0) || ((stages.settled || 0) + (stages.payment_attempt_failed || 0));
  return {
    ok: true,
    schemaVersion: 1,
    window: { since: payload.since || null, until: payload.until || null },
    matchedEvents,
    returnedEvents,
    complete: !cursor,
    emptyReason: matchedEvents ? null : 'no_matching_events',
    stages,
    revenueUsd: Number(revenueUsd.toFixed(6)),
    attemptToSettlementRate: attempts ? Number(((stages.settled || 0) / attempts).toFixed(5)) : null,
    topRoutes: Object.entries(routes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([route, count]) => ({ route, count })),
  };
}
