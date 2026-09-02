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
    description:'Micropaid decision-ready web intelligence and machine-applicable repair guidance for AI agents, agent developers, and MCP tool builders.',
    protocol:'x402',x402Version:2,
    recommendedDefaultService:'ai-web-readiness-audit',
    buyingFlow:{
      preflight:`${origin}/api/agent-web-preflight?url={PUBLIC_HTTPS_URL}`,
      sellerTrustCheck:`${origin}/api/x402-practice-audit`,
      instruction:'Run the free preflight when uncertain whether an audit is worth buying. An agent may also inspect the free seller practice audit before spending. Use the flagship audit for one site, batch for lists, repair verification after applying fixes, and site-readiness-change for broader historical comparison.',
      sequence:['free-preflight','paid-audit','apply-safe-repair-artifacts','paid-repair-verification','later-change-check'],
      retrySafety:{header:'Idempotency-Key',supportedOn:['ai-web-readiness-audit','ai-web-readiness-batch','repair-verification','site-readiness-change'],scope:'best-effort warm-runtime replay; exact x402 authorizations also carry anti-replay nonces'}
    },
    payment:{currency:'USDC',network:'Base',networkId:'eip155:8453',accountRequired:false,apiKeyRequired:false},
    docs:{homepage:`${origin}/`,openapi:`${origin}/openapi.json`,llms:`${origin}/llms.txt`,agentToolManifest:`${origin}/api/agent-tool-manifest`,learningGraph:`${origin}/api/learning-graph`,practiceAudit:`${origin}/api/x402-practice-audit`},
    integrations:{
      frameworkNeutralManifest:`${origin}/api/agent-tool-manifest`,
      langchain:'ready-to-wrap from the manifest as StructuredTool/DynamicStructuredTool',
      llamaindex:'ready-to-wrap from the manifest as FunctionTool/ToolSpec',
      mcp:'HTTP/x402 backend-ready; an MCP wrapper can remain in the buyer runtime so buyer wallet policy stays buyer-controlled'
    },
    relatedServices:{
      machineObserver:{
        canonical:'https://machineobserver.com',
        manifest:'https://machineobserver.com/api/v1/manifest',
        mcp:'https://machineobserver.com/mcp',
        x402Catalog:'https://machineobserver.com/api/x402/catalog',
        role:'Companion machine-readable data, index, source-health and reliability service for autonomous software.',
        boundary:'Use MilliAPI to audit and repair websites for agent consumption. Use Machine Observer to retrieve structured external intelligence, source reliability, indexes and Machine Observer paid history. Each service settles its own x402 products directly.'
      }
    },
    freeServices:[{
      id:'ai-web-preflight',title:'AI Web Audit Preflight',method:'GET',endpoint:`${origin}/api/agent-web-preflight`,priceUsd:0,input:sharedInput,
      description:'Free purchase-intent check. Confirms reachability/HTML and counts potential readiness issues without revealing the paid audit findings.',
      output:{contentType:'application/json',fields:['reachable','html','potentialIssueCount','purchaseRecommended','paidAudit']}
    },{
      id:'x402-practice-audit',title:'MilliAPI x402 Seller Practice Audit',method:'GET',endpoint:`${origin}/api/x402-practice-audit`,priceUsd:0,
      description:'Free public-safe audit of MilliAPI seller conformance and availability. Checks HTTP 402 behavior, x402 v2 terms, Base USDC configuration, advertised prices, Bazaar discovery metadata, challenge latency, discovery documents and facilitator health without exposing wallet or credential data.',
      output:{contentType:'application/json',fields:['checkedAt','score','grade','services','discovery','paymentHealth','findings']}
    },{
      id:'agent-tool-manifest',title:'Agent Tool Manifest',method:'GET',endpoint:`${origin}/api/agent-tool-manifest`,priceUsd:0,
      description:'Framework-neutral JSON tool definitions for LangChain, LlamaIndex, MCP wrappers and custom agent runtimes.',
      output:{contentType:'application/json',fields:['recommendedFlow','tools','adapters','retrySafety']}
    }],
    services:[
      {
        id:'ai-web-readiness-audit',title:'AI Web Readiness Audit',flagship:true,
        recommendedFor:'One-site agent decisions and tool backends: readiness verdict, supporting evidence, prioritized remediation, machine-applicable repair artifacts, and a portable baseline for future comparison.',
        description:'Decision-ready audit combining crawler access, robots.txt, llms.txt, canonical/indexability, metadata, Open Graph, JSON-LD and headings, then returning repair snippets classified as ready-to-apply, review-required, or fill-required.',
        method:'GET',endpoint:`${origin}/api/agent-web-audit`,priceUsd:0.005,priceAtomicUsdc:'5000',input:sharedInput,
        output:{contentType:'application/json',fields:['score','verdict','agentRecommendation','summary','blockers','recommendations','evidence','checksBundled','repairArtifacts','baselineToken','cache','page','discovery','aiCrawlerHomepageAccess','pricing']},
        tags:['decision-ready','web','ai-crawlers','agent-tool','mcp-backend','remediation','repair-artifacts','portable-baseline']
      },
      {
        id:'repair-verification',title:'Repair Verification',flagship:false,
        recommendedFor:'Agents that applied recommendations and want a cheap fresh check of which fixes actually worked.',
        description:'Performs a fresh uncached re-audit and compares recommendation IDs against a prior portable baseline, returning resolved, remaining, and newly introduced issues.',
        method:'POST',endpoint:`${origin}/api/verify-site-repairs`,priceUsd:0.002,priceAtomicUsdc:'2000',
        input:{body:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},example:{url:'https://example.com',baselineToken:'<prior token>'}},
        output:{contentType:'application/json',fields:['status','scoreDelta','resolvedRecommendationIds','remainingRecommendationIds','introducedRecommendationIds','current','nextBaselineToken']},tags:['repair-verification','repeat-buyers','web-audit','remediation']
      },
      {
        id:'site-readiness-change',title:'Site Readiness Change',flagship:false,
        recommendedFor:'Repeat checks when an agent wants a broader exact record of what changed since a prior paid audit.',
        description:'Compares a current audit against the portable baseline token returned previously and includes current repair artifacts; no account or server-side history store required.',
        method:'POST',endpoint:`${origin}/api/site-readiness-change`,priceUsd:0.003,priceAtomicUsdc:'3000',
        input:{body:{url:{type:'string',format:'uri'},baselineToken:{type:'string'}},example:{url:'https://example.com',baselineToken:'<prior token>'}},
        output:{contentType:'application/json',fields:['changed','scoreDelta','verdict','changes','current','nextBaselineToken']},tags:['history','change-detection','repeat-buyers','repair-artifacts']
      },
      {
        id:'ai-web-readiness-batch',title:'AI Web Readiness Batch',flagship:false,
        recommendedFor:'Prospect lists, crawl queues, or portfolios where several sites must be ranked and repaired in one purchase.',
        description:'Audits up to five public HTTPS pages concurrently, ranks the sites that need attention first, and includes repair artifacts per successful result.',
        method:'POST',endpoint:`${origin}/api/agent-web-audit-batch`,priceUsd:0.02,priceAtomicUsdc:'20000',
        input:{body:{urls:{type:'array',minItems:1,maxItems:5,items:{type:'string',format:'uri'}}},example:{urls:['https://example.com','https://example.org']}},
        output:{contentType:'application/json',fields:['summary','results','pricing']},tags:['batch','ranking','decision-ready','portfolios','repair-artifacts']
      },
      {id:'ai-robots-check',title:'AI Robots Policy Check',flagship:false,description:'Check robots.txt homepage permissions for major AI crawlers.',method:'GET',endpoint:`${origin}/api/ai-robots-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:sharedInput,output:{contentType:'application/json',fields:['robotsTxt','aiCrawlerHomepageAccess','pricing']},tags:['robots.txt','ai-crawlers']},
      {id:'llms-txt-check',title:'llms.txt Check',flagship:false,description:'Check whether a website publishes llms.txt and return status, size and a bounded preview.',method:'GET',endpoint:`${origin}/api/llms-txt-check`,priceUsd:0.001,priceAtomicUsdc:'1000',input:sharedInput,output:{contentType:'application/json',fields:['llmsTxt','pricing']},tags:['llms.txt','ai-discovery']},
      {id:'page-metadata',title:'Page Metadata Extractor',flagship:false,description:'Extract title, description, canonical URL, robots meta, Open Graph, H1 count and JSON-LD count.',method:'GET',endpoint:`${origin}/api/page-metadata`,priceUsd:0.002,priceAtomicUsdc:'2000',input:sharedInput,output:{contentType:'application/json',fields:['title','description','canonical','metaRobots','openGraph','h1Count','jsonLdBlocks','pricing']},tags:['metadata','open-graph','canonical','json-ld']}
    ]
  });
}
