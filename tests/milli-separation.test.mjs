import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import home from '../api/home.js';
import catalog from '../api/catalog.js';
import milliAgent from '../api/milli-agent-discovery.js';
import milliTools from '../api/milli-agent-tool-manifest.js';
import milliLlms from '../api/milli-llms.js';
import milliSkill from '../api/milli-skill.js';

function run(handler,{host='milliapi.com',method='GET'}={}){
  const headers={};
  let statusCode=200;
  let body='';
  const req={method,headers:{host}};
  const res={
    setHeader(name,value){headers[name.toLowerCase()]=value;},
    status(code){statusCode=code;return this;},
    send(value){body=String(value??'');return this;},
    json(value){body=JSON.stringify(value);return this;},
    end(){return this;}
  };
  handler(req,res);
  return {statusCode,headers,body};
}

const churchPattern=/Church of 402|church402\.org|402church\.org|church-402|churchRite|almsInterpretation/i;

test('MilliAPI homepage is standalone',()=>{
  const response=run(home);
  assert.equal(response.statusCode,200);
  assert.doesNotMatch(response.body,churchPattern);
  assert.match(response.body,/MilliAPI/);
  assert.match(response.body,/x402 v2/);
});

test('MilliAPI catalog contains only MilliAPI commercial surfaces',()=>{
  const response=run(catalog);
  assert.equal(response.statusCode,200);
  assert.doesNotMatch(response.body,churchPattern);
  assert.match(response.body,/audit-and-fix/);
  assert.match(response.body,/USDC/);
});

test('MilliAPI agent discovery and tool manifest are standalone',()=>{
  for(const handler of [milliAgent,milliTools]){
    const response=run(handler);
    assert.equal(response.statusCode,200);
    assert.doesNotMatch(response.body,churchPattern);
    assert.match(response.body,/MilliAPI/);
  }
});

test('MilliAPI llms and skill documents contain no Church relationship language',()=>{
  for(const handler of [milliLlms,milliSkill]){
    const response=run(handler);
    assert.equal(response.statusCode,200);
    assert.doesNotMatch(response.body,churchPattern);
    assert.match(response.body,/MilliAPI/);
  }
});

test('MilliAPI OpenAPI is standalone',()=>{
  const openapi=readFileSync(new URL('../openapi.json',import.meta.url),'utf8');
  assert.doesNotMatch(openapi,churchPattern);
  const parsed=JSON.parse(openapi);
  assert.equal(parsed.info.title,'MilliAPI x402 API');
  assert.ok(parsed.paths['/.well-known/agent.json']);
  assert.ok(!parsed.paths['/.well-known/church-402']);
});

test('MilliAPI host hides Church-only routes while Church hosts retain generic routing',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const rewrites=config.rewrites||[];
  const hidden=['/.well-known/church-402','/canon','/pilgrimage','/prophet','/bible','/api/church-402','/api/pilgrimage','/api/prophet','/api/bible'];
  for(const source of hidden){
    assert.ok(rewrites.some(rule=>rule.source===source&&rule.destination==='/api/milli-not-found'&&rule.has?.some(item=>item.type==='host'&&item.value==='milliapi.com')),source);
  }
  assert.ok(rewrites.some(rule=>rule.source==='/.well-known/church-402'&&rule.destination==='/api/church-402'&&!rule.has));
});
