// api/ai-robots-check.js
import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { normalizePublicHttpsUrl, safePublicFetch } from './lib/safe-public-fetch.js';
import { registerLearningHooks } from './lib/learning-graph.js';

const ROUTE = '/api/ai-robots-check';
const NETWORK = 'eip155:8453';
const PRICE = '$0.001';
const PAY_TO = process.env.PAY_TO || '';
const BOTS = ['GPTBot','ChatGPT-User','OAI-SearchBot','ClaudeBot','Claude-User','Google-Extended','PerplexityBot','Applebot-Extended'];

function parseRobots(text) {
  const groups = [];
  let current = null;
  let sawRule = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0,i).trim().toLowerCase();
    const value = line.slice(i+1).trim();
    if (key === 'user-agent') {
      if (!current || sawRule) { current = { agents: [], rules: [] }; groups.push(current); sawRule = false; }
      current.agents.push(value.toLowerCase());
    } else if (current && (key === 'allow' || key === 'disallow')) {
      current.rules.push({ type:key, path:value });
      sawRule = true;
    }
  }
  return groups;
}

function homepageAccess(groups, bot) {
  const name = bot.toLowerCase();
  const exact = groups.filter(g => g.agents.includes(name));
  const applicable = exact.length ? exact : groups.filter(g => g.agents.includes('*'));
  if (!applicable.length) return { allowed:true, reason:'No matching robots.txt group' };
  const rules = applicable.flatMap(g => g.rules).filter(r => r.path !== '');
  const matching = rules.filter(r => '/'.startsWith(r.path) || r.path === '/').sort((a,b)=>b.path.length-a.path.length || (a.type==='allow'?-1:1));
  if (!matching.length) return { allowed:true, reason:'No matching homepage rule' };
  return { allowed:matching[0].type === 'allow', reason:`${matching[0].type}: ${matching[0].path}` };
}

const discovery = declareDiscoveryExtension({
  method:'GET',
  input:{ url:'https://example.com' },
  inputSchema:{ properties:{ url:{ type:'string', format:'uri', description:'Public HTTPS URL on the site to inspect' } }, required:['url'] },
  output:{ example:{ origin:'https://example.com', robotsTxt:{ present:false, status:404 }, aiCrawlerHomepageAccess:{ GPTBot:{ allowed:true, reason:'No matching robots.txt group' } } } }
});

async function handler(req,res) {
  try {
    const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (!raw) return res.status(400).json({ error:'Missing url query parameter' });
    const url = await normalizePublicHttpsUrl(raw);
    const robots = await safePublicFetch(`${url.origin}/robots.txt`, { maxBytes:256000, accept:'text/plain,*/*;q=0.2' });
    const present = robots.response.ok;
    const groups = present ? parseRobots(robots.text) : [];
    return res.status(200).json({
      product:'Money-Finder AI Robots Policy Check',
      origin:url.origin,
      checkedAt:new Date().toISOString(),
      robotsTxt:{ present, status:robots.response.status },
      aiCrawlerHomepageAccess:Object.fromEntries(BOTS.map(bot=>[bot,homepageAccess(groups,bot)])),
      pricing:{ protocol:'x402', pricePerCallUsd:0.001, currency:'USDC', network:'Base' }
    });
  } catch (error) {
    return res.status(400).json({ error:error?.message || 'Check failed' });
  }
}

const app = express();
app.set('trust proxy', true);
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, PAYMENT-SIGNATURE, X-PAYMENT');res.setHeader('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE');res.setHeader('Cache-Control','private, no-store');next();});
app.options(ROUTE,(_req,res)=>res.status(204).end());

if (PAY_TO && process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET) {
  const server = registerLearningHooks(
    new x402ResourceServer(createCdpFacilitatorClient()).register(NETWORK,new ExactEvmScheme()),
    { serviceId:'service:ai_robots', priceUsd:0.001 }
  );
  app.use(paymentMiddleware({ [`GET ${ROUTE}`]:{ accepts:[{scheme:'exact',price:PRICE,network:NETWORK,payTo:PAY_TO}], resource:`https://money-finder-nu.vercel.app${ROUTE}`, description:'Check robots.txt homepage permissions for major AI crawlers including GPTBot, OAI-SearchBot, ClaudeBot, Google-Extended, PerplexityBot and Applebot-Extended.', mimeType:'application/json', extensions:{...discovery} } },server));
} else app.use(ROUTE,(_req,res)=>res.status(503).json({error:'x402 payment configuration incomplete'}));

app.get(ROUTE,handler);
export default app;