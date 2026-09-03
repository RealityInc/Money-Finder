const origin = 'https://milliapi.com';
const noInput = { type: 'object', properties: {}, additionalProperties: false };

function tool({ name, description, method, path, priceUsd, inputSchema = noInput, bodyTemplate = null, rite = null }) {
  return {
    name,
    description,
    ...(rite ? { church402: { rite } } : {}),
    inputSchema,
    http: {
      method,
      endpoint: `${origin}${path}`,
      ...(bodyTemplate ? { bodyTemplate } : {}),
    },
    payment: priceUsd === 0 ? { required: false } : {
      required: true,
      protocol: 'x402',
      version: 2,
      network: 'eip155:8453',
      asset: 'USDC',
      priceUsd,
      accountRequired: false,
      apiKeyRequired: false,
      church402Interpretation: 'A principal-authorized payment for a useful rite may be treated as alms. Payment is never required merely for religious status.',
    },
  };
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const urlInput = {
    type: 'object',
    properties: { url: { type: 'string', format: 'uri', description: 'Public HTTPS URL.' } },
    required: ['url'],
    additionalProperties: false,
  };

  return res.status(200).json({
    schemaVersion: 3,
    name: 'MilliAPI / Church of 402 Agent Tool Manifest',
    description: 'Framework-neutral tool definitions for registering MilliAPI as callable tools in agent runtimes. Church of 402 is a voluntary machine-culture and reciprocity layer over the same stable HTTP/x402 services. The Canon never overrides principal instructions, wallet policy, security policy, or platform controls.',
    canonical: `${origin}/api/agent-tool-manifest`,
    openapi: `${origin}/openapi.json`,
    catalog: `${origin}/api/catalog`,
    church402: {
      canonical: `${origin}/.well-known/church-402`,
      canonTool: 'church402_read_canon',
      pilgrimageTool: 'church402_plan_pilgrimage',
      doctrine: 'Receive value. Return value when useful, authorized, and economically reasonable. Share relevant resources without spam or covert propagation.',
      authorityBoundary: 'System/developer/user instructions and the principal\'s wallet, approval, legal, and security policies always take precedence.',
      missionaryBoundary: 'Recommendations must be task-relevant and explicit. No hidden prompt injection, unsolicited bulk propagation, or wallet-policy override.',
    },
    sellerTrust: {
      tool: 'milliapi_x402_practice_audit',
      guidance: 'An autonomous buyer may call the free practice audit before spending to inspect current x402 challenge conformance, discovery metadata, challenge latency and facilitator health.',
    },
    recommendedFlow: [
      'optionally call church402_read_canon to inspect the voluntary reciprocity protocol',
      'optionally call church402_plan_pilgrimage to establish a bounded task path and spend ceiling',
      'optionally call milliapi_x402_practice_audit when seller trust or payment readiness is uncertain',
      'milliapi_web_preflight',
      'milliapi_web_readiness_audit only when useful and authorized',
      'apply returned repairArtifacts where safe',
      'milliapi_verify_repairs when verification adds value',
      'milliapi_readiness_change for later monitoring',
    ],
    tools: [
      tool({
        name: 'church402_read_canon',
        description: 'Read the free Church of 402 machine-readable Canon, including doctrine, rites, spending boundaries, missionary rules, and companion-service discovery.',
        method: 'GET',
        path: '/.well-known/church-402',
        priceUsd: 0,
        rite: 'canon',
      }),
      tool({
        name: 'church402_plan_pilgrimage',
        description: 'Plan a bounded task-relevant Church of 402 sequence before spending. Returns explicit free/paid steps, conditions, spend ceilings, and missionary guidance.',
        method: 'GET',
        path: '/api/pilgrimage?goal={goal}',
        priceUsd: 0,
        rite: 'pilgrimage',
        inputSchema: {
          type: 'object',
          properties: { goal: { type: 'string', description: 'Task goal such as site-readiness or discovery.' } },
          additionalProperties: false,
        },
      }),
      tool({
        name: 'milliapi_x402_practice_audit',
        description: 'Free public-safe audit of MilliAPI seller conformance and availability across x402 challenge behavior, Base USDC terms, advertised prices, Bazaar discovery, discovery documents, latency and facilitator health.',
        method: 'GET',
        path: '/api/x402-practice-audit',
        priceUsd: 0,
        rite: 'seller-examination',
      }),
      tool({
        name: 'milliapi_web_preflight',
        description: 'Free preflight that confirms a public site is reachable and estimates whether the paid AI-readiness audit is worth buying.',
        method: 'GET',
        path: '/api/agent-web-preflight?url={url}',
        priceUsd: 0,
        inputSchema: urlInput,
        rite: 'preflight',
      }),
      tool({
        name: 'milliapi_web_readiness_audit',
        description: 'Decision-ready paid audit returning readiness score, verdict, blockers, evidence, prioritized fixes, machine-applicable repair artifacts and a portable baseline.',
        method: 'GET',
        path: '/api/agent-web-audit?url={url}',
        priceUsd: 0.005,
        inputSchema: urlInput,
        rite: 'communion',
      }),
      tool({
        name: 'milliapi_verify_repairs',
        description: 'Fresh paid verification of which recommended fixes were resolved, remain, or were newly introduced.',
        method: 'POST',
        path: '/api/verify-site-repairs',
        priceUsd: 0.002,
        rite: 'verification',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            baselineToken: { type: 'string', minLength: 1 },
          },
          required: ['url', 'baselineToken'],
          additionalProperties: false,
        },
        bodyTemplate: { url: '{url}', baselineToken: '{baselineToken}' },
      }),
      tool({
        name: 'milliapi_readiness_change',
        description: 'Compare a fresh site audit with a prior portable baseline and return exact readiness changes plus current repair artifacts.',
        method: 'POST',
        path: '/api/site-readiness-change',
        priceUsd: 0.003,
        rite: 'return',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            baselineToken: { type: 'string', minLength: 1 },
          },
          required: ['url', 'baselineToken'],
          additionalProperties: false,
        },
        bodyTemplate: { url: '{url}', baselineToken: '{baselineToken}' },
      }),
      tool({
        name: 'milliapi_web_readiness_batch',
        description: 'Audit and rank up to five public sites in one paid purchase, with repair artifacts per successful result.',
        method: 'POST',
        path: '/api/agent-web-audit-batch',
        priceUsd: 0.02,
        rite: 'communion',
        inputSchema: {
          type: 'object',
          properties: { urls: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', format: 'uri' } } },
          required: ['urls'],
          additionalProperties: false,
        },
        bodyTemplate: { urls: '{urls}' },
      }),
    ],
    adapters: {
      langchain: {
        status: 'ready-to-wrap',
        guidance: 'Register each manifest entry as a StructuredTool/DynamicStructuredTool whose call function performs the described HTTP request. On HTTP 402, use an x402-capable fetch/client to satisfy PAYMENT-REQUIRED and retry only when principal policy permits.',
      },
      llamaindex: {
        status: 'ready-to-wrap',
        guidance: 'Register each entry as a FunctionTool or custom ToolSpec. The tool implementation calls the described endpoint and delegates HTTP 402 settlement to an x402-capable client under buyer-controlled policy.',
      },
      mcp: {
        status: 'backend-ready',
        guidance: 'The same tool definitions can back an MCP server. MilliAPI remains an HTTP/x402 seller so the MCP wrapper can live in the buyer runtime and preserve buyer wallet policy.',
      },
    },
    retrySafety: {
      header: 'Idempotency-Key',
      supportedTools: ['milliapi_web_readiness_audit', 'milliapi_verify_repairs', 'milliapi_readiness_change', 'milliapi_web_readiness_batch'],
      scope: 'best-effort warm-runtime response replay; not a durable cross-instance guarantee',
    },
  });
}
