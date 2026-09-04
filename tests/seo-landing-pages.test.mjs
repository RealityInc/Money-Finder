import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { invoke } from './helpers.mjs';
import { LANDING_PAGES } from '../api/lib/seo-landing-page.js';
import aiWeb from '../api/ai-web-readiness-audit.js';
import llms from '../api/llms-txt-audit.js';
import robots from '../api/robots-txt-ai-crawler-audit.js';
import seller from '../api/x402-seller-audit.js';
import sitemap from '../api/sitemap.js';

const handlers={
  'ai-web-readiness-audit':aiWeb,
  'llms-txt-audit':llms,
  'robots-txt-ai-crawler-audit':robots,
  'x402-seller-audit':seller,
};

test('commercial SEO pages expose complete, indexable server-rendered metadata and product links',async()=>{
  for(const [slug,handler] of Object.entries(handlers)){
    const {status,body}=await invoke(handler);
    const page=LANDING_PAGES[slug];
    assert.equal(status,200);
    assert.match(body,new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</title>`));
    assert.match(body,/<meta name="description" content="[^"]+">/);
    assert.match(body,new RegExp(`<h1>${page.h1}</h1>`));
    assert.match(body,new RegExp(`<link rel="canonical" href="https://milliapi\\.com/${slug}">`));
    assert.match(body,new RegExp(`href="${page.productId==='agent-web-audit'?'/api/agent-web-audit':page.productId==='llms-txt-check'?'/api/llms-txt-check':page.productId==='ai-robots-check'?'/api/ai-robots-check':'/api/x402-practice-audit'}`));
    assert.match(body,/href="\/openapi\.json"/);
    assert.doesNotMatch(body,/noindex|vercel\.app/i);
    assert.match(body,/application\/ld\+json/);
  }
});

test('MilliAPI sitemap includes all landing pages without leaking them to Church',()=>{
  const run=host=>{let body='';sitemap({method:'GET',headers:{host}},{setHeader(){},status(){return this},send(value){body=value;return this},end(){}});return body;};
  const milli=run('milliapi.com');
  for(const slug of Object.keys(handlers))assert.match(milli,new RegExp(`https://milliapi\\.com/${slug}`));
  const church=run('church402.org');
  for(const slug of Object.keys(handlers))assert.doesNotMatch(church,new RegExp(slug));
});

test('clean landing-page routes are wired in Vercel config',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  for(const slug of Object.keys(handlers))assert.ok(config.rewrites.some(rule=>rule.source===`/${slug}`&&rule.destination===`/api/${slug}`));
});

test('free seller audit has one direct, payment-free call to action',async()=>{
  const {body}=await invoke(seller);
  assert.match(body,/free live response/);
  assert.match(body,/href="\/api\/x402-practice-audit">Run the live audit<\/a>/);
  assert.match(body,/does not request or authorize payment/);
  assert.doesNotMatch(body,/x402-practice-audit\?url=|x402-practice-audit[^<]*preview=1|free per paid result/i);
});
