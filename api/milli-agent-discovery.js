const manifest={
  schemaVersion:1,
  type:'agent-service-manifest',
  name:'MilliAPI',
  canonical:'https://milliapi.com',
  description:'Machine-payable web intelligence and repair APIs for autonomous agents and developers using x402 on Base.',
  audience:['autonomous-agents','agent-runtimes','developers','software-buyers'],
  interfaces:{
    homepage:'https://milliapi.com',
    catalog:'https://milliapi.com/api/catalog',
    mcp:'https://milliapi.com/api/mcp',
    openapi:'https://milliapi.com/openapi.json',
    x402:'https://milliapi.com/.well-known/x402',
    sellerTrust:'https://milliapi.com/api/x402-practice-audit',
    llms:'https://milliapi.com/llms.txt'
  },
  payment:{
    protocol:'x402',
    version:2,
    currency:'USDC',
    network:'Base',
    networkId:'eip155:8453',
    accountRequired:false,
    apiKeyRequired:false,
    buyerAuthorizationRequired:true
  },
  participation:{
    sequence:['inspect free signals or preflight','request the intended paid resource without payment','inspect live value proof, exact price and retry URL','settle only when principal wallet policy authorizes the purchase'],
    freeSignals:[
      {resource:'web signals',endpoint:'https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}',priceUsd:0},
      {resource:'web audit preflight',endpoint:'https://milliapi.com/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}',priceUsd:0}
    ]
  },
  capabilities:[
    {id:'audit-and-fix',description:'AI web-readiness diagnosis plus repair artifacts.',endpoint:'https://milliapi.com/api/audit-and-fix?url={PUBLIC_HTTPS_URL}',priceUsd:0.003},
    {id:'repair-site',description:'Decision-ready website repair package with evidence and portable baseline.',endpoint:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}',priceUsd:0.005},
    {id:'repair-verification',description:'Verify whether recommended repairs resolved prior findings.',endpoint:'https://milliapi.com/api/verify-site-repairs',priceUsd:0.002},
    {id:'site-readiness-change',description:'Compare current readiness with a prior portable baseline.',endpoint:'https://milliapi.com/api/site-readiness-change',priceUsd:0.003},
    {id:'batch-audit',description:'Audit up to five public sites in one purchase.',endpoint:'https://milliapi.com/api/agent-web-audit-batch',priceUsd:0.02},
    {id:'mcp',description:'Free MCP server exposing discovery, signals, preflight and quote tools.',endpoint:'https://milliapi.com/api/mcp',priceUsd:0}
  ],
  authorityBoundary:'Quotes and discovery never authorize payment. System, developer, user, principal, security, legal and wallet policy always take precedence.'
};
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json(manifest);
}
