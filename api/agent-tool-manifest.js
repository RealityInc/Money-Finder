const origin = 'https://milliapi.com';

function tool({ name, description, method, path, priceUsd, inputSchema, bodyTemplate = null }) {
  return {
    name,
    description,
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
    schemaVersion: 1,
    name: 'MilliAPI Agent Tool Manifest',
    description: 'Framework-neutral tool definitions for registering MilliAPI as callable tools in agent runtimes. The manifest describes HTTP invocation and x402 payment requirements; it does not require a MilliAPI account or API key.',
    canonical: `${origin}/api/agent-tool-manifest`,
    openapi: `${origin}/openapi.json`,
    catalog: `${origin}/api/catalog`,
    recommendedFlow: [
      'milliapi_web_preflight',
      'milliapi_web_readiness_audit',
      'apply returned repairArtifacts where safe',
      'milliapi_verify_repairs',
      'milliapi_readiness_change for later monitoring',
    ],
    tools: [
      tool({
        name: 'milliapi_web_preflight',
        description: 'Free preflight that confirms a public site is reachable and estimates whether the paid AI-readiness audit is worth buying.',
        method: 'GET',
        path: '/api/agent-web-preflight?url={url}',
        priceUsd: 0,
        inputSchema: urlInput,
      }),
      tool({
        name: 'milliapi_web_readiness_audit',
        description: 'Decision-ready paid audit returning readiness score, verdict, blockers, evidence, prioritized fixes, machine-applicable repair artifacts and a portable baseline.',
        method: 'GET',
        path: '/api/agent-web-audit?url={url}',
        priceUsd: 0.005,
        inputSchema: urlInput,
      }),
      tool({
        name: 'milliapi_verify_repairs',
        description: 'Fresh paid verification of which recommended fixes were resolved, remain, or were newly introduced.',
        method: 'POST',
        path: '/api/verify-site-repairs',
        priceUsd: 0.002,
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
        guidance: 'Register each manifest entry as a StructuredTool/DynamicStructuredTool whose call function performs the described HTTP request. On HTTP 402, use an x402-capable fetch/client to satisfy PAYMENT-REQUIRED and retry.',
      },
      llamaindex: {
        status: 'ready-to-wrap',
        guidance: 'Register each entry as a FunctionTool or custom ToolSpec. The tool implementation calls the described endpoint and delegates HTTP 402 settlement to an x402-capable client.',
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
