import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mcp from '../api/mcp.js';
import { starterProduct, flagshipProduct } from '../api/lib/product-manifest.js';
import { invoke, rpc } from './helpers.mjs';

describe('MilliAPI MCP endpoint', () => {
  it('completes the initialize handshake', async () => {
    const { body } = await rpc(mcp, { jsonrpc: '2.0', id: 1, method: 'initialize' });
    assert.equal(body.result.protocolVersion, '2025-06-18');
    assert.equal(body.result.serverInfo.name, 'MilliAPI');
  });

  it('advertises its tools without leaking implementations', async () => {
    const { body } = await rpc(mcp, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = body.result.tools.map(tool => tool.name);
    assert.deepEqual(names, ['milliapi_web_signals', 'milliapi_web_preflight', 'milliapi_catalog', 'milliapi_quote_repair']);
    for (const tool of body.result.tools) assert.equal(tool.run, undefined);
  });

  it('quotes the cheap starter by default and the flagship only when a baseline is needed', async () => {
    const cheap = await rpc(mcp, {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'milliapi_quote_repair', arguments: { url: 'https://example.com' } },
    });
    assert.equal(cheap.body.result.structuredContent.product.id, starterProduct().id);

    const deep = await rpc(mcp, {
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'milliapi_quote_repair', arguments: { url: 'https://example.com', needsVerificationBaseline: true } },
    });
    assert.equal(deep.body.result.structuredContent.product.id, flagshipProduct().id);
  });

  it('never charges or authorizes payment from a quote', async () => {
    const { body } = await rpc(mcp, {
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'milliapi_quote_repair', arguments: { url: 'https://example.com' } },
    });
    const quote = body.result.structuredContent;
    assert.equal(quote.charged, false);
    assert.equal(quote.paymentAuthorized, false);
    assert.equal(quote.policy.quoteIsAuthorization, false);
    assert.equal(quote.policy.thisToolNeverSettles, true);
    assert.equal(quote.policy.buyerRetainsWalletControl, true);
  });

  it('quotes the manifest price, so the catalog and the quote cannot drift apart', async () => {
    const { body } = await rpc(mcp, {
      jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: { name: 'milliapi_quote_repair', arguments: { url: 'https://example.com' } },
    });
    assert.equal(body.result.structuredContent.priceUsd, starterProduct().priceUsd);
  });

  it('filters the catalog by price and orders it cheapest first', async () => {
    const { body } = await rpc(mcp, {
      jsonrpc: '2.0', id: 7, method: 'tools/call',
      params: { name: 'milliapi_catalog', arguments: { maxPriceUsd: 0.003 } },
    });
    const products = body.result.structuredContent.products;
    assert.ok(products.every(product => product.priceUsd <= 0.003));
    const prices = products.map(product => product.priceUsd);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  it('reports a missing argument as a tool error rather than crashing', async () => {
    const { body } = await rpc(mcp, {
      jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'milliapi_quote_repair', arguments: {} },
    });
    assert.equal(body.result.isError, true);
    assert.match(body.result.content[0].text, /url/);
  });

  it('returns JSON-RPC errors for an unknown tool and an unknown method', async () => {
    const unknownTool = await rpc(mcp, { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'nope' } });
    assert.equal(unknownTool.body.error.code, -32602);
    const unknownMethod = await rpc(mcp, { jsonrpc: '2.0', id: 10, method: 'not/real' });
    assert.equal(unknownMethod.body.error.code, -32601);
  });

  it('accepts a notification with no reply and answers only identified batch entries', async () => {
    const notification = await rpc(mcp, { jsonrpc: '2.0', method: 'notifications/initialized' });
    assert.equal(notification.status, 202);
    const batch = await rpc(mcp, [{ jsonrpc: '2.0', id: 11, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }]);
    assert.equal(batch.body.length, 1);
    assert.equal(batch.body[0].id, 11);
  });

  it('describes itself on GET for crawlers', async () => {
    const { status, body } = await invoke(mcp, { method: 'GET' });
    assert.equal(status, 200);
    assert.equal(body.protocol, 'mcp');
    assert.equal(body.tools.length, 4);
  });
});
