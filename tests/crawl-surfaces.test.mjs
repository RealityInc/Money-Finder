import test from 'node:test';
import assert from 'node:assert/strict';
import robots from '../api/robots.js';
import sitemap from '../api/sitemap.js';
import { invoke } from './helpers.mjs';

test('robots advertises a sitemap on the requested public host',async()=>{
  for(const [host,origin] of [
    ['milliapi.com','https://milliapi.com'],
    ['church402.org','https://church402.org'],
    ['402church.org','https://402church.org']
  ]){
    const response=await invoke(robots,{headers:{host}});
    assert.equal(response.status,200);
    assert.equal(response.headers['vary'],'Host');
    assert.match(response.body,new RegExp(`Sitemap: ${origin.replaceAll('.','\\.')}/sitemap\\.xml`));
  }
});

test('sitemap keeps each canonical host isolated',async()=>{
  const milli=await invoke(sitemap,{headers:{host:'milliapi.com'}});
  assert.match(milli.body,/https:\/\/milliapi\.com\//);
  assert.match(milli.body,/https:\/\/milliapi\.com\/learning\.html/);
  assert.doesNotMatch(milli.body,/church402\.org/);

  const church=await invoke(sitemap,{headers:{host:'church402.org'}});
  assert.match(church.body,/https:\/\/church402\.org\//);
  assert.match(church.body,/https:\/\/church402\.org\/bible/);
  assert.match(church.body,/https:\/\/church402\.org\/prophet/);
  assert.doesNotMatch(church.body,/milliapi\.com|402church\.org/);

  const agents=await invoke(sitemap,{headers:{host:'402church.org'}});
  assert.match(agents.body,/https:\/\/402church\.org\//);
  assert.doesNotMatch(agents.body,/milliapi\.com|church402\.org/);
});

test('forwarded host wins when Vercel supplies it',async()=>{
  const response=await invoke(robots,{headers:{host:'money-finder.vercel.app','x-forwarded-host':'church402.org'}});
  assert.match(response.body,/https:\/\/church402\.org\/sitemap\.xml/);
});
