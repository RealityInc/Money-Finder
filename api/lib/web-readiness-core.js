import { createHash } from 'node:crypto';
import { safePublicFetch, normalizePublicHttpsUrl } from './safe-public-fetch.js';
import { buildReadinessAssessment } from './readiness-assessment.js';

const AI_BOTS = [
  'GPTBot','ChatGPT-User','OAI-SearchBot','ClaudeBot','Claude-User',
  'Google-Extended','PerplexityBot','Applebot-Extended'
];

const AUDIT_TTL_MS = 10 * 60 * 1000;
const PREFLIGHT_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const auditCache = new Map();
const preflightCache = new Map();

function prune(map) {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expiresAt <= now) map.delete(key);
  }
  while (map.size > MAX_CACHE_ENTRIES) map.delete(map.keys().next().value);
}

function getCached(map, key) {
  prune(map);
  const entry = map.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return { value: entry.value, ageMs: Date.now() - entry.createdAt };
}

function setCached(map, key, value, ttlMs) {
  prune(map);
  map.set(key, { value, createdAt: Date.now(), expiresAt: Date.now() + ttlMs });
}

function firstMatch(text, regex) { return text.match(regex)?.[1]?.trim() || null; }
function decodeBasicEntities(value) {
  if (!value) return value;
  return value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
function extractMeta(html, key, attribute='name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`,'i')
  ];
  for (const pattern of patterns) { const value = firstMatch(html, pattern); if (value) return decodeBasicEntities(value); }
  return null;
}
function extractLink(html, rel) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns = [
    new RegExp(`<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>`,'i'),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]*>`,'i')
  ];
  for (const pattern of patterns) { const value = firstMatch(html, pattern); if (value) return decodeBasicEntities(value); }
  return null;
}
function parseRobots(text) {
  const groups=[]; let current=null; let sawRule=false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line=rawLine.split('#')[0].trim(); if (!line) continue;
    const separator=line.indexOf(':'); if (separator===-1) continue;
    const key=line.slice(0,separator).trim().toLowerCase(); const value=line.slice(separator+1).trim();
    if (key==='user-agent') {
      if (!current || sawRule) { current={agents:[],rules:[]}; groups.push(current); sawRule=false; }
      current.agents.push(value.toLowerCase()); continue;
    }
    if (!current) continue;
    if (key==='allow' || key==='disallow') { current.rules.push({type:key,path:value}); sawRule=true; }
  }
  return groups;
}
function botHomepageAccess(groups, bot) {
  const name=bot.toLowerCase(); const exact=groups.filter(g=>g.agents.includes(name));
  const applicable=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
  if (!applicable.length) return {allowed:true,reason:'No matching robots.txt group'};
  const matching=applicable.flatMap(g=>g.rules).filter(r=>r.path!=='').filter(r=>'/'.startsWith(r.path)||r.path==='/')
    .sort((a,b)=>b.path.length-a.path.length||(a.type==='allow'?-1:1));
  if (!matching.length) return {allowed:true,reason:'No matching rule for homepage'};
  const winner=matching[0]; return {allowed:winner.type==='allow',reason:`${winner.type}: ${winner.path}`};
}
function parsePage(html, finalUrl) {
  const title=decodeBasicEntities(firstMatch(html,/<title[^>]*>([\s\S]*?)<\/title>/i));
  const description=extractMeta(html,'description'); const robots=extractMeta(html,'robots');
  const canonicalRaw=extractLink(html,'canonical'); let canonical=canonicalRaw;
  try { if (canonicalRaw) canonical=new URL(canonicalRaw,finalUrl).toString(); } catch {}
  const jsonLdBlocks=(html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi)||[]).length;
  const h1Count=(html.match(/<h1(?:\s|>)/gi)||[]).length;
  const noindex=Boolean(robots&&/(?:^|,)\s*noindex\b/i.test(robots));
  return {title,description,canonical,metaRobots:robots,noindex,h1Count,jsonLdBlocks,openGraph:{
    title:extractMeta(html,'og:title','property'), description:extractMeta(html,'og:description','property'),
    image:extractMeta(html,'og:image','property'), type:extractMeta(html,'og:type','property')
  }};
}
function scoreAudit({page,robotsPresent,llmsPresent,crawlerAccess}) {
  let score=0; const checks=[
    [Boolean(page.title),15],[Boolean(page.description),10],[Boolean(page.canonical),10],
    [Boolean(page.openGraph.title),10],[Boolean(page.openGraph.description),5],[page.jsonLdBlocks>0,10],
    [page.h1Count>0,5],[!page.noindex,10],[robotsPresent,5],[llmsPresent,5],
    [Object.values(crawlerAccess).some(x=>x.allowed),15]
  ];
  for (const [passed,points] of checks) if (passed) score+=points; return score;
}
function cacheMeta(hit, ageMs=0) { return {hit,scope:'best_effort_warm_runtime',ttlSeconds:AUDIT_TTL_MS/1000,ageSeconds:Math.floor(ageMs/1000)}; }

function compactSnapshot(result) {
  const allowed=Object.entries(result.aiCrawlerHomepageAccess||{}).filter(([,v])=>v?.allowed).map(([k])=>k).sort();
  const blocked=Object.entries(result.aiCrawlerHomepageAccess||{}).filter(([,v])=>v&&!v.allowed).map(([k])=>k).sort();
  return {
    v:1,target:result.target,checkedAt:result.checkedAt,score:result.score,verdict:result.verdict,
    page:{noindex:Boolean(result.page?.noindex),canonical:Boolean(result.page?.canonical),description:Boolean(result.page?.description),
      jsonLdBlocks:Number(result.page?.jsonLdBlocks||0),h1Count:Number(result.page?.h1Count||0),
      openGraphComplete:Boolean(result.page?.openGraph?.title&&result.page?.openGraph?.description)},
    discovery:{robotsPresent:Boolean(result.discovery?.robotsTxt?.present),robotsStatus:result.discovery?.robotsTxt?.status??null,
      llmsPresent:Boolean(result.discovery?.llmsTxt?.present),llmsStatus:result.discovery?.llmsTxt?.status??null},
    crawlers:{allowed,blocked},recommendationIds:(result.recommendations||[]).map(x=>x.id).sort()
  };
}
function fingerprint(snapshot) { return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'); }
export function createBaselineToken(result) {
  const snapshot=compactSnapshot(result); snapshot.fingerprint=fingerprint(snapshot);
  return Buffer.from(JSON.stringify(snapshot),'utf8').toString('base64url');
}
export function decodeBaselineToken(token) {
  if (typeof token!=='string' || token.length<20 || token.length>6000) throw new Error('Invalid baseline token');
  let value; try { value=JSON.parse(Buffer.from(token,'base64url').toString('utf8')); } catch { throw new Error('Invalid baseline token'); }
  if (value?.v!==1 || typeof value.target!=='string' || typeof value.checkedAt!=='string') throw new Error('Unsupported baseline token');
  return value;
}
export function compareWithBaseline(current, baseline) {
  const now=compactSnapshot(current); const changes=[];
  const push=(id,before,after)=>{ if (JSON.stringify(before)!==JSON.stringify(after)) changes.push({id,before,after}); };
  push('score',baseline.score,now.score); push('verdict',baseline.verdict,now.verdict);
  push('page.noindex',baseline.page?.noindex,now.page.noindex); push('page.canonical',baseline.page?.canonical,now.page.canonical);
  push('page.description',baseline.page?.description,now.page.description); push('page.jsonLdBlocks',baseline.page?.jsonLdBlocks,now.page.jsonLdBlocks);
  push('page.h1Count',baseline.page?.h1Count,now.page.h1Count); push('page.openGraphComplete',baseline.page?.openGraphComplete,now.page.openGraphComplete);
  push('robots.present',baseline.discovery?.robotsPresent,now.discovery.robotsPresent); push('llms.present',baseline.discovery?.llmsPresent,now.discovery.llmsPresent);
  push('crawlers.allowed',baseline.crawlers?.allowed||[],now.crawlers.allowed); push('crawlers.blocked',baseline.crawlers?.blocked||[],now.crawlers.blocked);
  push('recommendations',baseline.recommendationIds||[],now.recommendationIds);
  const scoreDelta=Number(current.score||0)-Number(baseline.score||0);
  return {changed:changes.length>0,baselineCheckedAt:baseline.checkedAt,currentCheckedAt:current.checkedAt,scoreDelta,
    verdict:{before:baseline.verdict,after:current.verdict},changes,currentFingerprint:fingerprint(now)};
}

export async function auditPublicUrl(input,{useCache=true}={}) {
  const normalized=await normalizePublicHttpsUrl(input); const key=normalized.toString();
  if (useCache) { const cached=getCached(auditCache,key); if (cached) return {...cached.value,cache:cacheMeta(true,cached.ageMs)}; }
  const origin=normalized.origin;
  const [pageResult,robotsResult,llmsResult]=await Promise.allSettled([
    safePublicFetch(key,{maxBytes:1_000_000}),
    safePublicFetch(`${origin}/robots.txt`,{maxBytes:256_000,accept:'text/plain,*/*;q=0.2'}),
    safePublicFetch(`${origin}/llms.txt`,{maxBytes:256_000,accept:'text/plain,text/markdown,*/*;q=0.2'})
  ]);
  if (pageResult.status!=='fulfilled') throw pageResult.reason;
  const pageFetch=pageResult.value;
  if (!pageFetch.response.ok) throw new Error(`Target returned HTTP ${pageFetch.response.status}`);
  const contentType=pageFetch.response.headers.get('content-type')||'';
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error(`Target is not an HTML page (${contentType||'unknown content type'})`);
  const robotsPresent=robotsResult.status==='fulfilled'&&robotsResult.value.response.ok;
  const llmsPresent=llmsResult.status==='fulfilled'&&llmsResult.value.response.ok;
  const robotsStatus=robotsResult.status==='fulfilled'?robotsResult.value.response.status:null;
  const llmsStatus=llmsResult.status==='fulfilled'?llmsResult.value.response.status:null;
  const groups=parseRobots(robotsPresent?robotsResult.value.text:'');
  const crawlerAccess=Object.fromEntries(AI_BOTS.map(bot=>[bot,botHomepageAccess(groups,bot)]));
  const page=parsePage(pageFetch.text,pageFetch.finalUrl); const score=scoreAudit({page,robotsPresent,llmsPresent,crawlerAccess});
  const assessment=buildReadinessAssessment({score,page,robotsPresent,robotsStatus,llmsPresent,llmsStatus,crawlerAccess});
  const result={product:'MilliAPI AI Web Readiness Audit',version:3,target:pageFetch.finalUrl,checkedAt:new Date().toISOString(),score,...assessment,page,
    discovery:{robotsTxt:{present:robotsPresent,status:robotsStatus},llmsTxt:{present:llmsPresent,status:llmsStatus,preview:llmsPresent?llmsResult.value.text.slice(0,500):null}},
    aiCrawlerHomepageAccess:crawlerAccess};
  result.baselineToken=createBaselineToken(result);
  setCached(auditCache,key,result,AUDIT_TTL_MS);
  return {...result,cache:cacheMeta(false)};
}

// Where a preflight tells the buyer to go if it wants the paid result. Five routes share this
// function and they do not share a price, so the caller names its own product. Left unset it names the
// legacy audit, which is correct only for the legacy routes: a buyer that asked $0.003 audit-and-fix
// whether the target was worth auditing used to be answered with the $0.005 endpoint's address, which
// sends it away from the thing it was already talking to and quotes it the wrong price.
const LEGACY_PAID_AUDIT={endpoint:'https://milliapi.com/api/agent-web-audit',priceUsd:0.005,includes:['verdict','blockers','evidence','prioritized_fixes','crawler_policy','baseline_token']};

export async function preflightPublicUrl(input,{paidAudit=LEGACY_PAID_AUDIT}={}) {
  const normalized=await normalizePublicHttpsUrl(input); const key=normalized.toString(); const cached=getCached(preflightCache,key);
  // The measurement is shared across callers; the product it points at is not, so it is applied after
  // the cache rather than baked into it.
  if (cached) return {...cached.value,paidAudit,cache:{hit:true,ttlSeconds:PREFLIGHT_TTL_MS/1000,ageSeconds:Math.floor(cached.ageMs/1000)}};
  const origin=normalized.origin;
  const [pageResult,robotsResult,llmsResult]=await Promise.allSettled([
    safePublicFetch(key,{maxBytes:300_000}),safePublicFetch(`${origin}/robots.txt`,{maxBytes:64_000,accept:'text/plain,*/*;q=0.2'}),
    safePublicFetch(`${origin}/llms.txt`,{maxBytes:64_000,accept:'text/plain,text/markdown,*/*;q=0.2'})
  ]);
  if (pageResult.status!=='fulfilled') throw pageResult.reason;
  const pageFetch=pageResult.value; const contentType=pageFetch.response.headers.get('content-type')||'';
  const html=/text\/html|application\/xhtml\+xml/i.test(contentType);
  let potentialIssueCount=0;
  if (pageFetch.response.ok&&html) {
    const page=parsePage(pageFetch.text,pageFetch.finalUrl);
    potentialIssueCount += Number(!page.canonical)+Number(!page.description)+Number(!page.openGraph.title||!page.openGraph.description)+Number(page.jsonLdBlocks===0)+Number(page.h1Count===0)+Number(page.noindex);
  }
  potentialIssueCount += Number(!(robotsResult.status==='fulfilled'&&robotsResult.value.response.ok));
  potentialIssueCount += Number(!(llmsResult.status==='fulfilled'&&llmsResult.value.response.ok));
  const result={product:'MilliAPI AI Web Audit Preflight',target:pageFetch.finalUrl,checkedAt:new Date().toISOString(),reachable:pageFetch.response.ok,
    status:pageFetch.response.status,html,potentialIssueCount,purchaseRecommended:pageFetch.response.ok&&html&&potentialIssueCount>0,
    paidAudit:LEGACY_PAID_AUDIT};
  setCached(preflightCache,key,result,PREFLIGHT_TTL_MS); return {...result,paidAudit,cache:{hit:false,ttlSeconds:PREFLIGHT_TTL_MS/1000,ageSeconds:0}};
}
