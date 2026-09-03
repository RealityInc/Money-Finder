// Free x402 discovery fan-out for crawlers and registries such as x402scan.
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json({
    version:4,
    freeSignals:'https://milliapi.com/api/web-signals?url={PUBLIC_HTTPS_URL}',
    freePreflight:'https://milliapi.com/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}',
    flagship:{
      resource:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}',
      preview:'https://milliapi.com/api/repair-site?url={PUBLIC_HTTPS_URL}&preview=1',
      priceUsd:0.005,
      value:'Decision-ready diagnosis plus exact repair artifacts and verification handoff.'
    },
    resources:[
      'https://milliapi.com/api/repair-site',
      'https://milliapi.com/api/agent-web-audit',
      'https://milliapi.com/api/agent-web-audit-batch',
      'https://milliapi.com/api/verify-site-repairs',
      'https://milliapi.com/api/site-readiness-change',
      'https://milliapi.com/api/ai-robots-check',
      'https://milliapi.com/api/llms-txt-check',
      'https://milliapi.com/api/page-metadata'
    ],
    commoditySignalPolicy:'Page metadata, robots.txt status, llms.txt status, and major AI-crawler homepage access are available free through /api/web-signals. Granular paid endpoints remain for compatibility.',
    instructions:'Start with free Web Signals when raw observations are sufficient. Use Repair This Site when the buyer needs prioritized diagnosis, exact repair artifacts, evidence, and a portable verification baseline. See https://milliapi.com/api/catalog for selection and retry guidance.'
  });
}
