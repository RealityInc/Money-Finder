// api/catalog.js
// Free discovery surface for agents and developers.

export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const origin='https://milliapi.com';
  const sharedInput={query:{url:{type:'string',format:'uri',required:true,constraints:'Public HTTPS URL only'}},example:{url:'https://example.com'}};
  return res.status(200).json({
    name:'MilliAPI',
    description:'Micropaid decision-ready web intelligence and narrow machine-readable utilities for AI agents.',
    protocol:'x402',x402Version:2,
    recommendedDefaultService:'ai-web-readiness-audit',
    buyingFlow:{
      preflight:`${origin}/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}`,
      instruction:'Run the free preflight when uncertain whether an audit is worth buying. Use the flagship audit for one site, batch for lists, and site-readiness-change with a prior baseline token for historical comparison.'
    },
    payment:{currency:'USDC',network:'Base',networkId:'eip155:8453',accountRequired:false,apiKeyRequired:false},
    docs:{homepage:`${origin}/`,openapi:`${origin}/openapi.json`,llms:`${origin}/llms.txt`,learningGraph:`${origin}/api/learning-graph`,practiceAudit:`${origin}/api/x402-practice-audit`},
    freeServices:[{
      id:'ai-web-preflight',title:'AI Web Audit Preflight',method:'GET',endpoint:`${origin}/api/agent-web-preflight`,priceUsd:0,input:sharedInput,
      description:'Free purchase-intent check. Confirms reachability/HTML and counts potential readiness issues without revealing the paid audit findings.',
      output:{contentType:'application/json',fields:['reachable','html','potentialIssueCount','purchaseRecommended','paidAudit']}
    }],
    services:[
      {
        id:'ai-web-readiness-audit',title:'AI Web Readiness Audit',flagship:true,
        recommendedFor:'One-site decisions: readiness verdict, supporting evidence, prioritized remediation, and a portable baseline for future change detection.',
        description:'Decision-ready audit combining crawler access, robots.txt, llms.txt, canonical/indexability, metadata, Open Graph, JSON-LD and headings.',
        method:'GET',endpoint:`${origin}/api/agent-web-audit`,priceUsd:0.005,priceAtomicUsdc:'5000',input:sharedInput,
        output:{contentType:'application/json',fields:['score','verdict','agentRecommendation','summary','blockers','recommendations','evidence','checksBundled','baselineToken','cache','page','discovery','aiCrawlerHomepageAccess','pricing']},
        tags:['decision-ready','web','ai-crawlers','remediation','portable-baseline']
      },
      {
        id:'ai-web-readiness-batch',title:'AI Web Readiness Batch',flagship:false,
        recommendedFor:'Prospect lists, crawl queues, or portfolios where several sites must be ranked in one purchase.',
        description:'Audits up to five public HTTPS pages concurrently and ranks the sites that need attention first.',
        method:'POST',endpoint:`${origin}/api/agent-web-audit-batch`,priceUsd:0.02,priceAtomicUsdc:'20000',
        input:{body:{urls:{type:'array',minItems:1,maxItems:5,items:{type:'string',format:'uri'}}},example:{urls:['https://example.com','https://example.org']}},
        output:{contentType:'application/json',fields:['summary','results','pricing']},tags:['batch','ranking','decision-ready','portfolios']
      },
      {
        id:'site-readiness-change',title:'Site Readiness Change',flagship:false,
        recommendedFor:'Repeat checks when an agent wants to know what changed since a prior paid audit.',
        description:'Compares a current audit against the portable baseline token returned previously; no account or server-side history store required.',
        method:'POST',endpoint:`${origin}/api/site-readiness-change`,priceUsd:0.003,priceAtomicUsdc:'3000',
        input:{body:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},example:{url:'https://example.com',baselineToken:'<prior token>'}},
        output:{contentType:'application/json',fields:['changed','scoreDelta','verdict','changes','current','nextBaselineToken']},tags:['history','change-detection','repeat-buyers']
      },
      {id:'ai-robots-check',title:'AI Robots Policy Check',flagship:false,description:'Check robots.txt homepage permissions for major AI crawlers.',method:'GET',endpoint:`${origin}/api/ai-robots-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:sharedInput,output:{contentType:'application/json',fields:['robotsTxt','aiCrawlerHomepageAccess','pricing']},tags:['robots.txt','ai-crawlers']},
      {id:'llms-txt-check',title:'llms.txt Check',flagship:false,description:'Check whether a website publishes llms.txt and return status, size and a bounded preview.',method:'GET',endpoint:`${origin}/api/llms-txt-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:sharedInput,output:{contentType:'application/json',fields:['llmsTxt','pricing']},tags:['llms.txt','ai-discovery']},
      {id:'page-metadata',title:'Page Metadata Extractor',flagship:false,description:'Extract title, description, canonical URL, robots meta, Open Graph, H1 count and JSON-LD count.',method:'GET',endpoint:`${origin}/api/page-metadata`,priceUsd:0.002,priceAtomicUsdc:'2000',input:sharedInput,output:{contentType:'application/json',fields:['title','description','canonical','metaRobots','openGraph','h1Count','jsonLdBlocks','pricing']},tags:['metadata','open-graph','canonical','json-ld']}
    ]
  });
}
