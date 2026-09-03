import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('publishes Chinese human pages with an English switch',()=>{
 const page=readFileSync(new URL('../api/home-zh.js',import.meta.url),'utf8');
 const vercel=readFileSync(new URL('../vercel.json',import.meta.url),'utf8');
 assert.match(page,/html lang="zh-CN"/);
 assert.match(page,/English/);
 assert.match(page,/付款边界/);
 assert.match(vercel,/home-zh/);
});
