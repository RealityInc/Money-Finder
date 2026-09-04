import { PRODUCTS } from './product-manifest.js';

const ORIGIN='https://milliapi.com';
const byId=id=>PRODUCTS.find(product=>product.id===id);
const money=value=>value===0?'free':`$${value.toFixed(3)}`;
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export const LANDING_PAGES={
  'ai-web-readiness-audit':{
    title:'AI Web Readiness Audit for Agent-Ready Websites | MilliAPI',
    description:'Audit whether a website is readable, discoverable, and usable by AI agents. Check crawler access, llms.txt, metadata, structured data, and repair priorities.',
    h1:'Make your website readable by AI agents',
    productId:'agent-web-audit',previewId:'agent-web-preflight',
    problem:'A page can work perfectly in a browser while hiding its meaning or blocking the software that needs to discover it. MilliAPI turns those scattered signals into one decision-ready AI web readiness audit.',
    audience:'Useful for developers, technical SEO teams, API publishers, and agent builders deciding whether a public site is ready for AI search and autonomous workflows.',
    checks:['Major AI-crawler access in robots.txt','llms.txt presence and retrieval','title, description, canonical, headings, Open Graph, and JSON-LD','a 0–100 readiness score with blockers and prioritized fixes'],
    response:'The paid JSON response includes a verdict, score, crawler policy, evidence, prioritized recommendations, repair artifacts, and a portable baseline for later verification.',
    example:'{"score":72,"verdict":"repairable","blockers":["GPTBot disallowed"],"recommendations":["publish llms.txt"]}',
  },
  'llms-txt-audit':{
    title:'llms.txt Audit and Validator for AI Crawlers | MilliAPI',
    description:'Check llms.txt availability and content for an AI-ready website. Get a structured x402 result with retrieval evidence and practical next steps.',
    h1:'Check whether your llms.txt helps AI agents',
    productId:'llms-txt-check',previewId:'web-signals',
    problem:'Publishing an llms.txt file is only useful when it is reachable and gives machines a clear route to the site’s canonical resources. This focused check validates the live public file instead of assuming deployment succeeded.',
    audience:'Useful for site owners, documentation teams, and agent-platform engineers adding machine-readable guidance to a public web property.',
    checks:['whether /llms.txt exists and returns successfully','response type and usable text','the final URL after redirects','evidence an automated workflow can consume directly'],
    response:'The paid response contains the checked URL, HTTP evidence, presence result, and practical interpretation. Use the broader readiness audit when you also need crawler, metadata, and structured-data analysis.',
    example:'{"target":"https://example.com/","llmsTxt":{"exists":true,"status":200},"priceUsd":0.001}',
  },
  'robots-txt-ai-crawler-audit':{
    title:'robots.txt AI Crawler Audit | Check AI Bot Access | MilliAPI',
    description:'Audit robots.txt rules for major AI crawlers such as GPTBot, OAI-SearchBot, ClaudeBot, and PerplexityBot with a structured x402 response.',
    h1:'Audit robots.txt access for AI crawlers',
    productId:'ai-robots-check',previewId:'web-signals',
    problem:'One broad disallow, an unexpected wildcard, or a host mismatch can keep AI search and agent crawlers away from otherwise public content. MilliAPI evaluates the effective policy for named AI bots.',
    audience:'Useful for technical SEO teams, publishers, security reviewers, and developers who need intentional—not accidental—AI crawler access.',
    checks:['robots.txt retrieval and final URL','effective allow or disallow decisions for major AI crawlers','missing or conflicting policy signals','structured evidence suitable for CI or monitoring'],
    response:'The paid response reports each evaluated crawler, its access decision, the relevant policy evidence, and the checked timestamp without changing the target site.',
    example:'{"robots":{"exists":true,"status":200},"crawlers":{"OAI-SearchBot":"allowed","GPTBot":"blocked"}}',
  },
  'x402-seller-audit':{
    title:'x402 Seller Audit for Payment Endpoints | MilliAPI',
    description:'Audit an x402 seller endpoint for challenge quality, discovery, retry safety, pricing clarity, and buyer-compatible integration practices.',
    h1:'Test an x402 seller before agents depend on it',
    productId:'x402-practice-audit',previewId:'x402-practice-audit',
    problem:'Returning HTTP 402 is only the start. Buyers also need coherent payment requirements, stable retry URLs, clear pricing, discovery, and safe failure behavior. The seller audit checks those integration surfaces together.',
    audience:'Useful for x402 API sellers, payment facilitators, agent marketplaces, and buyer-runtime teams reviewing a new paid endpoint.',
    checks:['payment challenge structure and advertised protocol','price, network, asset, and retry clarity','seller discovery and agent-facing documentation','integration findings separated from settlement execution'],
    response:'The response contains a seller-practice scorecard, evidence, prioritized findings, and remediation guidance. The audit does not authorize or perform a purchase of the target endpoint.',
    example:'{"seller":"api.example.com","challenge":"valid","retrySafe":true,"findings":["publish x402 discovery"]}',
  }
};

export function renderLanding(slug){
  const page=LANDING_PAGES[slug];
  const product=byId(page.productId);
  const preview=byId(page.previewId);
  const free=product.priceUsd===0;
  const canonical=`${ORIGIN}/${slug}`;
  const endpoint=`${ORIGIN}${product.path}`;
  const previewUrl=`${ORIGIN}${preview.path}?url=https%3A%2F%2Fexample.com${page.productId==='x402-practice-audit'?'&preview=1':''}`;
  const callUrl=free?product.path:`${product.path}?url=https%3A%2F%2Fexample.com`;
  const previewAction=preview.id===product.id?'':`<a class="button" href="${previewUrl}">${preview.priceUsd===0?'Run free preflight':'Preview the offer'}</a>`;
  const related=Object.entries(LANDING_PAGES).filter(([key])=>key!==slug).map(([key,value])=>{const price=byId(value.productId).priceUsd;return `<a class="card" href="/${key}"><strong>${esc(value.h1)}</strong><span>${price===0?'Free live tool':`${money(price)} per paid result`}</span></a>`;}).join('');
  const jsonLd={'@context':'https://schema.org','@graph':[{'@type':'WebAPI',name:product.title,description:page.description,url:canonical,documentation:`${ORIGIN}/openapi.json`,provider:{'@type':'Organization',name:'MilliAPI',url:`${ORIGIN}/`},offers:{'@type':'Offer',price:product.priceUsd.toFixed(3),priceCurrency:'USD'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'MilliAPI',item:`${ORIGIN}/`},{'@type':'ListItem',position:2,name:page.h1,item:canonical}]}]};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="index,follow,max-snippet:-1"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ORIGIN}/api/social-card"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(page.title)}"><meta name="twitter:description" content="${esc(page.description)}"><meta name="twitter:image" content="${ORIGIN}/api/social-card"><script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<','\\u003c')}</script><style>:root{color-scheme:dark;--bg:#071018;--panel:#0d1822;--text:#eef6fb;--muted:#9eb0bd;--blue:#5d86ff;--line:#203342}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 65% -10%,#16305b55,transparent 35%),var(--bg);color:var(--text);font:16px/1.65 system-ui,sans-serif}a{color:inherit}.wrap{width:min(1040px,calc(100% - 36px));margin:auto}nav,footer{display:flex;justify-content:space-between;gap:20px;padding:22px 0;border-bottom:1px solid var(--line)}nav div{display:flex;gap:18px}.brand{font-weight:900;text-decoration:none;letter-spacing:.04em}.brand span,.eyebrow{color:var(--blue)}main{padding:70px 0}.hero{max-width:820px}h1{font-size:clamp(42px,7vw,76px);line-height:1;letter-spacing:-.05em;margin:10px 0 22px}h2{font-size:30px;margin-top:0}.lede{font-size:20px;color:#c9d6df}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0}.button{padding:12px 16px;border:1px solid var(--blue);border-radius:9px;text-decoration:none;font-weight:750}.button.primary{background:var(--blue);color:#fff}.section{margin-top:62px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.card{display:flex;flex-direction:column;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:20px;text-decoration:none}.card span,.muted{color:var(--muted)}li{margin:.55em 0}pre{white-space:pre-wrap;word-break:break-word;background:#050b10;border:1px solid var(--line);border-radius:12px;padding:18px;color:#b9d1ff}footer{border-top:1px solid var(--line);border-bottom:0;margin-top:70px;color:var(--muted)}@media(max-width:700px){nav,footer{flex-direction:column}.grid{grid-template-columns:1fr}}</style></head><body><div class="wrap"><nav><a class="brand" href="/">Milli<span>API</span></a><div><a href="/openapi.json">OpenAPI</a><a href="/api/catalog">API catalog</a></div></nav><main><section class="hero"><div class="eyebrow">${esc(product.title)} · ${free?'free live response':`${money(product.priceUsd)} per successful response`}</div><h1>${esc(page.h1)}</h1><p class="lede">${esc(page.problem)}</p><div class="actions"><a class="button primary" href="${callUrl}">${free?'Run the live audit':'Call the API'}</a>${previewAction}<a class="button" href="/openapi.json">Read OpenAPI</a></div><p class="muted">${free?'This live audit is free and does not request or authorize payment.':'No account, subscription, or API key is required. Paid calls use x402 with USDC on Base: request the endpoint, inspect the HTTP 402 terms, authorize payment under your own wallet policy, then retry with the payment signature.'}</p></section><section class="section grid"><div><h2>Who it is for</h2><p>${esc(page.audience)}</p></div><div><h2>${free?'What the result contains':'What the paid result contains'}</h2><p>${esc(page.response)}</p></div></section><section class="section"><h2>What MilliAPI checks</h2><ul>${page.checks.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section><section class="section"><h2>Representative result</h2><p class="muted">Fields vary with the target and live evidence; this abbreviated example shows the response shape, not a promised score.</p><pre><code>${esc(page.example)}</code></pre><p><strong>Current price:</strong> ${free?'free':`${money(product.priceUsd)} per successful response`}, derived from MilliAPI’s product manifest.${free?'':' Unqualified or invalid work is not presented as a successful paid result.'}</p></section><section class="section"><h2>Related MilliAPI audits</h2><div class="grid">${related}</div></section></main><footer><span>MilliAPI · small APIs, useful answers</span><span><a href="/">Home</a> · <a href="/llms.txt">llms.txt</a></span></footer></div></body></html>`;
}

export function landingHandler(slug){return function handler(req,res){if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).send('GET only');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=3600');const html=renderLanding(slug);if(req.method==='HEAD')return res.status(200).end();return res.status(200).send(html);};}
