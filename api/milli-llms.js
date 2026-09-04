const BODY=`# MilliAPI

MilliAPI is a standalone commercial x402 API service for autonomous agents and developers.

## Canonical surfaces
- Home: https://milliapi.com/
- Catalog: https://milliapi.com/api/catalog
- OpenAPI: https://milliapi.com/openapi.json
- Agent manifest: https://milliapi.com/.well-known/agent.json
- x402 discovery: https://milliapi.com/.well-known/x402
- MCP: https://milliapi.com/api/mcp
- Seller practice audit: https://milliapi.com/api/x402-practice-audit

## Free acquisition surfaces
- Web signals: GET https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}
- Audit preflight: GET https://milliapi.com/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}

## Paid outcomes
- Audit + Fix: GET https://milliapi.com/api/audit-and-fix?url={PUBLIC_HTTPS_URL} — $0.003 USDC
- Repair This Site: GET https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL} — $0.005 USDC
- Repair Verification: POST https://milliapi.com/api/verify-site-repairs — $0.002 USDC
- Site Readiness Change: POST https://milliapi.com/api/site-readiness-change — $0.003 USDC
- Batch Audit: POST https://milliapi.com/api/agent-web-audit-batch — $0.020 USDC
- AI Robots Check: GET https://milliapi.com/api/ai-robots-check?url={PUBLIC_HTTPS_URL} — $0.001 USDC
- llms.txt Check: GET https://milliapi.com/api/llms-txt-check?url={PUBLIC_HTTPS_URL} — $0.001 USDC
- Page Metadata: GET https://milliapi.com/api/page-metadata?url={PUBLIC_HTTPS_URL} — $0.002 USDC

## Payment policy
Paid resources use x402 v2 with USDC on Base. Request the intended paid resource without payment first, inspect the returned value proof and exact price, and settle only when authorized by the caller or principal wallet policy. Quotes and discovery never authorize spending.
`;

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(BODY);
}
