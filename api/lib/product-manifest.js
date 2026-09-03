// Single source of truth for the MilliAPI products that must stay discoverable.
//
// Every entry here has to be named by each surface listed in `surfaces`. The
// discovery-coverage check in scripts/check-discovery-coverage.mjs enforces
// that, so a new SKU cannot ship invisible to buyers.

export const ALL_SURFACES = ['x402', 'catalog', 'toolManifest', 'agentManifest', 'llms', 'skill', 'openapi'];

export const PRODUCTS = [
  {
    id: 'audit-and-fix',
    path: '/api/audit-and-fix',
    method: 'GET',
    priceUsd: 0.003,
    role: 'starter',
    title: 'Audit + Fix',
    idempotent: true,
    surfaces: ALL_SURFACES,
  },
  {
    id: 'repair-site',
    path: '/api/repair-site',
    method: 'GET',
    priceUsd: 0.005,
    role: 'flagship',
    title: 'Repair This Site',
    idempotent: true,
    surfaces: ALL_SURFACES,
  },
  {
    id: 'web-signals',
    path: '/api/web-signals',
    method: 'GET',
    priceUsd: 0,
    role: 'free-acquisition',
    title: 'Free Agent Web Signals',
    idempotent: false,
    surfaces: ALL_SURFACES,
  },
  {
    id: 'mcp',
    path: '/api/mcp',
    method: 'POST',
    priceUsd: 0,
    role: 'free-acquisition',
    title: 'MilliAPI MCP server',
    idempotent: false,
    surfaces: ['x402', 'catalog', 'toolManifest', 'agentManifest', 'llms', 'skill', 'openapi'],
  },
  {
    id: 'agent-web-preflight',
    path: '/api/agent-web-preflight',
    method: 'GET',
    priceUsd: 0,
    role: 'free-acquisition',
    title: 'AI Web Audit Preflight',
    idempotent: false,
    surfaces: ['x402', 'catalog', 'toolManifest', 'llms', 'openapi'],
  },
  {
    id: 'verify-site-repairs',
    path: '/api/verify-site-repairs',
    method: 'POST',
    priceUsd: 0.002,
    role: 'repeat',
    title: 'Repair Verification',
    idempotent: true,
    surfaces: ['x402', 'catalog', 'toolManifest', 'llms', 'openapi'],
  },
  {
    id: 'site-readiness-change',
    path: '/api/site-readiness-change',
    method: 'POST',
    priceUsd: 0.003,
    role: 'repeat',
    title: 'Site Readiness Change',
    idempotent: true,
    surfaces: ['x402', 'catalog', 'toolManifest', 'openapi'],
  },
  {
    id: 'agent-web-audit-batch',
    path: '/api/agent-web-audit-batch',
    method: 'POST',
    priceUsd: 0.02,
    role: 'paid',
    title: 'AI Web Readiness Batch',
    idempotent: true,
    surfaces: ['x402', 'catalog', 'toolManifest', 'openapi'],
  },
  {
    id: 'agent-web-audit',
    path: '/api/agent-web-audit',
    method: 'GET',
    priceUsd: 0.005,
    role: 'legacy',
    title: 'AI Web Readiness Audit',
    idempotent: true,
    surfaces: ['x402', 'catalog', 'toolManifest', 'openapi'],
  },
  { id: 'ai-robots-check', path: '/api/ai-robots-check', method: 'GET', priceUsd: 0.001, role: 'legacy', title: 'AI Robots Policy Check', idempotent: false, surfaces: ['x402', 'catalog', 'toolManifest', 'openapi'] },
  { id: 'llms-txt-check', path: '/api/llms-txt-check', method: 'GET', priceUsd: 0.001, role: 'legacy', title: 'llms.txt Check', idempotent: false, surfaces: ['x402', 'catalog', 'toolManifest', 'openapi'] },
  { id: 'page-metadata', path: '/api/page-metadata', method: 'GET', priceUsd: 0.002, role: 'legacy', title: 'Page Metadata Extractor', idempotent: false, surfaces: ['x402', 'catalog', 'toolManifest', 'openapi'] },
];

export function starterProduct() {
  return PRODUCTS.find(product => product.role === 'starter') || null;
}

export function flagshipProduct() {
  return PRODUCTS.find(product => product.role === 'flagship') || null;
}
