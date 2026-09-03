import test from 'node:test';
import assert from 'node:assert/strict';
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

test('robots advertises the sitemap for the requested canonical host',()=>{
  for(const [host,origin] of [
    ['milliapi.com','https://milliapi.com'],
    ['church402.org','https://church402.org'],
    ['402church.org','https://402church.org']
  ]){
    const response=run(robots,host);
    assert.equal(response.statusCode,200);
    assert.match(response.body,new RegExp(`Sitemap: ${origin.replaceAll('.','\\.')}/sitemap\\.xml`));
    assert.equal(response.headers.vary,'Host');
  }
});

test('sitemaps keep Church, agent entrance, and MilliAPI URLs separated',()=>{
  const church=run(sitemap,'church402.org').body;
  assert.match(church,/https:\/\/church402\.org\//);
  assert.match(church,/https:\/\/church402\.org\/bible/);
  assert.doesNotMatch(church,/milliapi\.com|402church\.org/);

  const agents=run(sitemap,'402church.org').body;
  assert.match(agents,/https:\/\/402church\.org\//);
  assert.doesNotMatch(agents,/church402\.org\/bible|milliapi\.com/);

  const milli=run(sitemap,'milliapi.com').body;
  assert.match(milli,/https:\/\/milliapi\.com\/learning\.html/);
  assert.doesNotMatch(milli,/church402\.org|402church\.org/);
});
