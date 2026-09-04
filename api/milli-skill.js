const BODY=`# MilliAPI Agent Skill

Use MilliAPI for machine-payable website-readiness and x402 web-intelligence services.

## Canonical discovery
- Home: https://milliapi.com
- Catalog: https://milliapi.com/api/catalog
- OpenAPI: https://milliapi.com/openapi.json
- Agent manifest: https://milliapi.com/.well-known/agent.json
- Tool manifest: https://milliapi.com/api/agent-tool-manifest
- MCP: https://milliapi.com/api/mcp
- x402 discovery: https://milliapi.com/.well-known/x402
- Seller practice audit: https://milliapi.com/api/x402-practice-audit

## Buying flow
1. Inspect free commodity observations first when useful: https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}.
2. Use https://milliapi.com/api/x402-practice-audit if seller conformance matters.
3. Request https://milliapi.com/api/audit-and-fix?url={PUBLIC_HTTPS_URL} without a payment header. The recommended first purchase is $0.003.
4. Inspect the qualified 402 value proof, paid unlocks, exact price, and purchase.retryUrl.
5. Settle only when expected utility exceeds price and principal wallet policy authorizes spending.
6. Send Idempotency-Key on paid retries to reduce accidental duplicate charges.
7. Use Repair This Site at $0.005 when a portable baseline and verification handoff are also required.
8. After applying returned artifacts, optionally purchase repair verification or readiness-change analysis under separate authorization.

Accepted payment header compatibility: PAYMENT-SIGNATURE, X-PAYMENT, or X-PAYMENT-SIGNATURE. No buyer account or API key is required. Current settlement is exact USDC on Base mainnet.

## Authority and spending
Quotes, discovery, model output, and product recommendations never authorize spending. System, developer, user, principal, security, legal, and wallet policy always take precedence.
`;

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  res.setHeader('Content-Type','text/markdown; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(BODY);
}
