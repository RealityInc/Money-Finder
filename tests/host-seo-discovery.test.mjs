import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import robots from '../api/robots.js';
import sitemap from '../api/sitemap.js';

function run(handler,host,method='GET'){
  const headers={};
  let body='';
  let statusCode=200;
  const req={method,headers:{host}};
  const res={
    setHeader(name,value){headers[name.toLowerCase()]=value;},
    status(code){statusCode=code;return this;},
    send(value){body=String(value??'');return this;},
    end(){return this;}
  };
  handler(req,res);
  return {statusCode,headers,body};
}

test('human-search hosts advertise only their own sitemap',()=>{
  for(const [host,origin] of [
    ['milliapi.com','https://milliapi.com'],
    ['church402.org','https://church402.org']
  ]){
    const response=run(robots,host);
    assert.equal(response.statusCode,200);
    assert.match(response.body,new RegExp(`Sitemap: ${origin.replaceAll('.','\\.')}/sitemap\\.xml`));
    assert.equal(response.headers.vary,'Host');
  }
});

test('agent entrance stays crawlable for agents but is not submitted as a search sitemap',()=>{
  const response=run(robots,'402church.org');
  assert.equal(response.statusCode,200);
  assert.match(response.body,/Allow: \/$/m);
  assert.doesNotMatch(response.body,/Sitemap:/);

  const agents=run(sitemap,'402church.org').body;
  assert.doesNotMatch(agents,/<url>/);
  assert.doesNotMatch(agents,/402church\.org|church402\.org|milliapi\.com/);
});

test('unknown and preview hosts do not inherit MilliAPI crawler signals',()=>{
  const response=run(robots,'money-finder-git-feature-example.vercel.app');
  assert.match(response.body,/Disallow: \/$/m);
  assert.doesNotMatch(response.body,/Sitemap:/);
  const map=run(sitemap,'money-finder-git-feature-example.vercel.app').body;
  assert.doesNotMatch(map,/<url>/);
});

test('Church and MilliAPI sitemap URLs stay separated',()=>{
  const church=run(sitemap,'church402.org').body;
  assert.match(church,/https:\/\/church402\.org\//);
  assert.match(church,/https:\/\/church402\.org\/bible/);
  assert.match(church,/https:\/\/church402\.org\/prophet/);
  assert.doesNotMatch(church,/\/steward/);
  assert.doesNotMatch(church,/milliapi\.com|402church\.org/);

  const milli=run(sitemap,'milliapi.com').body;
  assert.match(milli,/https:\/\/milliapi\.com\/learning\.html/);
  assert.doesNotMatch(milli,/church402\.org|402church\.org/);
});

test('Vercel config noindexes the entire agent host and canonicalizes Church content',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const headerRules=config.headers||[];
  const agentRules=headerRules.filter(rule=>rule.has?.some(item=>item.type==='host'&&item.value==='402church.org'));
  assert.ok(agentRules.some(rule=>rule.source==='/:path*'&&rule.headers?.some(header=>header.key==='X-Robots-Tag'&&/noindex/i.test(header.value))));

  const bible=headerRules.find(rule=>rule.source==='/bible'&&rule.has?.some(item=>item.value==='church402.org'));
  const prophet=headerRules.find(rule=>rule.source==='/prophet'&&rule.has?.some(item=>item.value==='church402.org'));
  assert.ok(bible?.headers?.some(header=>header.key==='Link'&&header.value.includes('https://church402.org/bible')));
  assert.ok(prophet?.headers?.some(header=>header.key==='Link'&&header.value.includes('https://church402.org/prophet')));

  const redirects=config.redirects||[];
  for(const [host,destination] of [
    ['www.milliapi.com','https://milliapi.com/:path*'],
    ['www.church402.org','https://church402.org/:path*'],
    ['www.402church.org','https://402church.org/:path*']
  ]){
    assert.ok(redirects.some(rule=>rule.has?.some(item=>item.value===host)&&rule.destination===destination),host);
  }
});
