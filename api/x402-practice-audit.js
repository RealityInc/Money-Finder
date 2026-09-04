// api/x402-practice-audit.js
// Public-safe live audit of MilliAPI's x402 seller surface.
// It never returns PAY_TO, API credentials, buyer data, or payment signatures.

const ORIGIN = 'https://milliapi.com';
const NETWORK = 'eip155:8453';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'.toLowerCase();

const SERVICES = [
  { id: 'audit-and-fix', path: '/api/audit-and-fix', method: 'GET', queryUrl: true, amount: '3000', priceUsd: 0.003, qualified: true, role: 'starter' },
  { id: 'repair-site', path: '/api/repair-site', method: 'GET', queryUrl: true, amount: '5000', priceUsd: 0.005, qualified: true, role: 'flagship' },
  { id: 'ai-robots-check', path: '/api/ai-robots-check', method: 'GET', queryUrl: true, amount: '1000', priceUsd: 0.001, qualified: true },
  { id: 'llms-txt-check', path: '/api/llms-txt-check', method: 'GET', queryUrl: true, amount: '1000', priceUsd: 0.001, qualified: true },
  { id: 'page-metadata', path: '/api/page-metadata', method: 'GET', queryUrl: true, amount: '2000', priceUsd: 0.002 },
  { id: 'ai-web-readiness-audit', path: '/api/agent-web-audit', method: 'GET', queryUrl: true, amount: '5000', priceUsd: 0.005 },
  { id: 'repair-verification', path: '/api/verify-site-repairs', method: 'POST', body: { url: 'https://example.com', baselineToken: 'seller-practice-probe' }, amount: '2000', priceUsd: 0.002 },
  { id: 'site-readiness-change', path: '/api/site-readiness-change', method: 'POST', body: { url: 'https://example.com', baselineToken: 'seller-practice-probe' }, amount: '3000', priceUsd: 0.003 },
  { id: 'ai-web-readiness-batch', path: '/api/agent-web-audit-batch', method: 'POST', body: { urls: ['https://example.com'] }, amount: '20000', priceUsd: 0.020 }
];

function decodePaymentRequired(value) {
  if (!value) return null;
  try { return JSON.parse(Buffer.from(value, 'base64').toString('utf8')); }
  catch { return null; }
}

async function fetchWithTimeout(url, timeoutMs = 12000, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MilliAPI-Practice-Audit/3.0',
        ...(init.headers || {})
      },
      signal: controller.signal
    });
    return { response, latencyMs: Date.now() - started };
  } finally { clearTimeout(timer); }
}

function check(label, ok, points, detail = null) { return { label, ok: Boolean(ok), points: ok ? points : 0, maxPoints: points, detail }; }

function validateBazaarInvocation(bazaar, service) {
  const input = bazaar?.info?.input;
  const schemaInput = bazaar?.schema?.properties?.input;
  const methodEnum = schemaInput?.properties?.method?.enum || [];
  const requiredInput = schemaInput?.required || [];
  const requiredOutput = bazaar?.schema?.properties?.output?.properties?.example?.required || [];
  const outputExample = bazaar?.info?.output?.example;
  const missingOutput = requiredOutput.filter(key => !outputExample || !Object.prototype.hasOwnProperty.call(outputExample, key));
  const methodOk = input?.type === 'http' && input?.method === service.method && methodEnum.includes(service.method) && requiredInput.includes('method');
  const payloadOk = service.method === 'POST'
    ? input?.bodyType === 'json' && input?.body && typeof input.body === 'object' && requiredInput.includes('bodyType') && requiredInput.includes('body')
    : Boolean(input?.queryParams && typeof input.queryParams === 'object');
  return {
    ok: Boolean(bazaar?.schema && methodOk && payloadOk && missingOutput.length === 0),
    detail: {
      method: input?.method || null,
      bodyType: input?.bodyType || null,
      missingOutputFields: missingOutput
    }
  };
}

async function auditService(service) {
  const suffix = service.queryUrl ? `?url=${encodeURIComponent('https://example.com')}` : '';
  const requestUrl = `${ORIGIN}${service.path}${suffix}`;
  const init = { method: service.method || 'GET' };
  if (service.body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(service.body);
  }
  let result; let firstError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      result = await fetchWithTimeout(requestUrl, 12000, init);
      if (result.response.status === 402) break;
      if (attempt === 0 && result.response.status >= 500) continue;
      break;
    } catch (error) { firstError = error; if (attempt === 1) throw error; }
  }
  if (!result) throw firstError || new Error('No response');

  if (service.qualified && result.response.status === 200) {
    let body = null;
    try { body = await result.response.json(); } catch { body = null; }
    const declined = body && body.purchaseRecommended === false && (body.charged === false || body.noCharge === true);
    if (declined) {
      // Refusing to charge when live qualification finds no paid work is the documented
      // seller behaviour, so it is scored as a pass rather than a missing challenge.
      const checks = [
        check('No-charge response when live qualification finds no paid work', true, 4, body.reason || 'purchaseRecommended=false'),
        check('Fast qualification', result.latencyMs < 5000, 1, `${result.latencyMs} ms`)
      ];
      return { id: service.id, endpoint: service.path, method: service.method || 'GET', priceUsd: service.priceUsd, role: service.role || null, status: 200, outcome: 'no_charge_qualified', latencyMs: result.latencyMs, score: checks.reduce((sum, item) => sum + item.points, 0), maxScore: checks.reduce((sum, item) => sum + item.maxPoints, 0), checks };
    }
  }

  const paymentRequired = decodePaymentRequired(result.response.headers.get('payment-required'));
  const accept = paymentRequired?.accepts?.[0] || null;
  const resource = paymentRequired?.resource || {};
  const bazaar = paymentRequired?.extensions?.bazaar || null;
  const bazaarValidation = validateBazaarInvocation(bazaar, service);
  const tags = Array.isArray(resource.tags) ? resource.tags : [];
  const checks = [
    check('HTTP 402 payment challenge', result.response.status === 402, 4, `HTTP ${result.response.status}`),
    check('x402 v2', paymentRequired?.x402Version === 2, 2, paymentRequired?.x402Version ?? null),
    check('Exact USDC payment on Base', accept?.scheme === 'exact' && accept?.network === NETWORK && String(accept?.asset || '').toLowerCase() === USDC_BASE, 3, accept ? `${accept.scheme} · ${accept.network}` : null),
    check('Advertised amount matches catalog', accept?.amount === service.amount, 2, accept?.amount ?? null),
    check('Resource description + JSON mime type', typeof resource.description === 'string' && resource.description.length >= 40 && resource.mimeType === 'application/json', 2),
    check('Seller identity metadata', typeof resource.serviceName === 'string' && resource.serviceName.length > 0 && resource.serviceName.length <= 32 && tags.length > 0 && tags.length <= 5 && tags.every(tag => typeof tag === 'string' && tag.length <= 32) && /^https:\/\//.test(resource.iconUrl || ''), 3),
    check('Valid Bazaar invocation metadata', bazaarValidation.ok, 3, bazaarValidation.detail),
    check('Idempotent paid retry advertised', Boolean(paymentRequired?.purchase?.idempotency?.supported), 1),
    check('Fast payment challenge', result.latencyMs < 5000, 1, `${result.latencyMs} ms`)
  ];
  return { id: service.id, endpoint: service.path, method: service.method || 'GET', priceUsd: service.priceUsd, role: service.role || null, status: result.response.status, outcome: 'payment_challenge', latencyMs: result.latencyMs, score: checks.reduce((sum, item) => sum + item.points, 0), maxScore: checks.reduce((sum, item) => sum + item.maxPoints, 0), checks };
}

async function auditFreeSurface(path) {
  try { const { response, latencyMs } = await fetchWithTimeout(`${ORIGIN}${path}`, 8000); return { path, ok: response.ok, status: response.status, latencyMs }; }
  catch (error) { return { path, ok: false, status: null, latencyMs: null, error: error?.message || 'request failed' }; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const [serviceResults, docs, health] = await Promise.all([
    Promise.all(SERVICES.map(async service => { try { return await auditService(service); } catch (error) { return { id: service.id, endpoint: service.path, method: service.method || 'GET', priceUsd: service.priceUsd, role: service.role || null, status: null, latencyMs: null, score: 0, maxScore: 20, error: error?.name === 'AbortError' ? 'Timed out' : error?.message || 'Audit failed', checks: [] }; } })),
    Promise.all(['/api/catalog', '/openapi.json', '/llms.txt'].map(auditFreeSurface)),
    auditFreeSurface('/api/x402-health')
  ]);

  const servicesScore = serviceResults.reduce((sum, service) => sum + service.score, 0);
  const servicesMax = serviceResults.reduce((sum, service) => sum + service.maxScore, 0);
  const docsScore = docs.filter(item => item.ok).length * 5;
  const healthScore = health.ok ? 5 : 0;
  const total = servicesScore + docsScore + healthScore;
  const max = servicesMax + 20;
  const score = Math.round((total / max) * 100);
  const findings = [];
  for (const service of serviceResults) {
    for (const item of service.checks || []) if (!item.ok) findings.push({ severity: item.maxPoints >= 3 ? 'high' : 'medium', service: service.id, issue: item.label, detail: item.detail });
    if (service.error) findings.push({ severity: 'high', service: service.id, issue: service.error });
  }
  for (const doc of docs) if (!doc.ok) findings.push({ severity: 'medium', service: 'discovery', issue: `${doc.path} unavailable`, detail: doc.status });
  if (!health.ok) findings.push({ severity: 'high', service: 'payment', issue: 'x402 facilitator health check failed', detail: health.status });

  return res.status(200).json({ audit: 'milliapi-x402-practice-audit', version: 4, checkedAt: new Date().toISOString(), score, grade: score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D', policy: { protocol: 'x402 v2', network: 'Base mainnet', paidRoutesAudited: SERVICES.length, currentProductsAudited: ['audit-and-fix', 'repair-site'], discovery: 'Validated Bazaar invocation metadata + catalog + OpenAPI + llms.txt', autoChangeBoundary: 'Discovery metadata, documentation, ranking and reliability improvements may be automated. Wallets, credentials, settlement semantics, new networks and material price changes require review.' }, services: serviceResults, discovery: docs, paymentHealth: health, findings, references: { x402Spec: 'https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md', bazaarDocs: 'https://github.com/x402-foundation/x402/blob/main/docs/extensions/bazaar.mdx' } });
}
