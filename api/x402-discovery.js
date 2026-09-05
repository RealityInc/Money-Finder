// Free x402 discovery fan-out for crawlers and registries such as x402scan.
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json({
    version:7,
    x402VersionsSupported:[1,2],
    protocolVersionNegotiation:{
      default:2,
      requestV1:'append x402Version=1, send an x402-version: 1 request header, or Accept: application/vnd.x402.v1+json',
      servedVersionHeader:'X-X402-Version-Served',
      note:'MilliAPI serves x402 v2 by default and v1 on request so v1-only clients can still pay.'
    },
    freeSignals:'https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}',
    freePreflight:'https://milliapi.com/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}',
    starter:{
      resource:'https://milliapi.com/api/audit-and-fix?url={PUBLIC_HTTPS_URL}',
      preview:'https://milliapi.com/api/audit-and-fix?url={PUBLIC_HTTPS_URL}&preview=1',
      priceUsd:0.003,
      value:'Cheapest useful purchase: one call returns the readiness verdict, prioritized findings, evidence, ready-to-apply repair artifacts, a portable baseline, and a free lightweight recheck.',
      recommendedFirstPurchase:true
    },
    flagship:{
      resource:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}',
      preview:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}&preview=1',
      priceUsd:0.005,
      value:'Decision-ready diagnosis plus exact repair artifacts and verification handoff.'
    },
    resources:[
      'https://milliapi.com/api/audit-and-fix',
      'https://milliapi.com/api/repair-site',
      'https://milliapi.com/api/agent-web-audit',
      'https://milliapi.com/api/agent-web-audit-batch',
      'https://milliapi.com/api/verify-site-repairs',
      'https://milliapi.com/api/site-readiness-change',
      'https://milliapi.com/api/ai-robots-check',
      'https://milliapi.com/api/llms-txt-check',
      'https://milliapi.com/api/page-metadata'
    ],
    mcp:{endpoint:'https://milliapi.com/api/mcp',alias:'https://milliapi.com/mcp',transport:'streamable-http',quoteOnly:true,description:'Free MCP server. Commodity signals and preflight execute directly; paid products are returned as quotes with their exact endpoint and price. It never settles a payment.'},
    freeResources:[
      'https://milliapi.com/api/mcp',
      'https://milliapi.com/api/web-signals',
      'https://milliapi.com/api/agent-web-preflight',
      'https://milliapi.com/api/catalog',
      'https://milliapi.com/api/x402-practice-audit'
    ],
    priceLadderUsd:{'audit-and-fix':0.003,'repair-site':0.005,'verify-site-repairs':0.002,'site-readiness-change':0.003,'agent-web-audit-batch':0.02},
    commoditySignalPolicy:'Page metadata, robots.txt status, llms.txt status, and major AI-crawler homepage access are available free through /api/web-signals. Granular paid endpoints remain for compatibility.',
    instructions:'Start with free Web Signals when raw observations are sufficient. When the buyer needs a fix rather than an observation, buy Audit + Fix at $0.003 — it is the recommended first purchase and returns repair artifacts in one call. Use Repair This Site when the buyer additionally needs a portable verification baseline and a verification handoff. See https://milliapi.com/api/catalog for selection and retry guidance.'
  });
}
