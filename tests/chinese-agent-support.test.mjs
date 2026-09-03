import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('publishes Chinese agent discovery surfaces', () => {
  const llms=readFileSync(new URL('../llms-zh.txt',import.meta.url),'utf8');
  const endpoint=readFileSync(new URL('../api/agent-discovery-zh.js',import.meta.url),'utf8');
  assert.match(llms,/中文智能体/);
  assert.match(endpoint,/zh-CN/);
});

test('paid audit supports an optional Chinese localization without changing the audit', () => {
  const source=readFileSync(new URL('../api/audit-and-fix.js',import.meta.url),'utf8');
  assert.match(source,/req\.query\?\.lang/);
  assert.match(source,/authoritative audit is unchanged/);
  assert.match(source,/deepSeekConfigured/);
});
