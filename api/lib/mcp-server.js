// Minimal MCP (Model Context Protocol) server over JSON-RPC 2.0 on plain HTTP.
//
// Hand-rolled rather than pulled from a library because this repository has no
// MCP dependency and the surface we need is small: initialize, tools/list,
// tools/call, ping. Keeping it dependency-free also keeps the cold start cheap,
// which matters on the same serverless instances that serve payment challenges.

const PROTOCOL_VERSION = '2025-06-18';
const JSONRPC = '2.0';

function rpcResult(id, result) {
  return { jsonrpc: JSONRPC, id, result };
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: JSONRPC, id: id ?? null, error };
}

export function toolResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

export function toolError(message) {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function publicTool(tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
  };
}

function missingRequired(schema, args) {
  const required = Array.isArray(schema?.required) ? schema.required : [];
  return required.filter(key => args[key] === undefined || args[key] === null || args[key] === '');
}

/**
 * Builds a Vercel-style handler serving one MCP endpoint.
 *
 * `tools` is a list of { name, title, description, inputSchema, annotations, run }.
 * `run(args)` returns the structured value; it is wrapped for MCP by toolResult.
 */
export function createMcpEndpoint({ serverName, serverVersion = '1.0.0', instructions, tools }) {
  const byName = new Map(tools.map(tool => [tool.name, tool]));

  async function dispatch(message) {
    const { id, method, params } = message || {};

    if (method === 'initialize') {
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: serverName, version: serverVersion },
        ...(instructions ? { instructions } : {}),
      });
    }

    if (method === 'ping') return rpcResult(id, {});

    if (method === 'tools/list') {
      return rpcResult(id, { tools: tools.map(publicTool) });
    }

    if (method === 'tools/call') {
      const name = params?.name;
      const tool = byName.get(name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};
      const missing = missingRequired(tool.inputSchema, args);
      if (missing.length) {
        return rpcResult(id, toolError(`Missing required argument${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`));
      }
      try {
        return rpcResult(id, toolResult(await tool.run(args)));
      } catch (error) {
        const message = error?.name === 'AbortError' ? 'The upstream request timed out' : error?.message || 'Tool call failed';
        return rpcResult(id, toolError(message));
      }
    }

    return rpcError(id, -32601, `Method not found: ${method}`);
  }

  return async function mcpHandler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, MCP-Protocol-Version');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method === 'GET') {
      // Not an SSE stream: this server is stateless, so a GET is only a
      // human- and crawler-readable description of the endpoint.
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json({
        server: serverName,
        version: serverVersion,
        protocol: 'mcp',
        protocolVersion: PROTOCOL_VERSION,
        transport: 'streamable-http (stateless JSON-RPC over POST)',
        instructions,
        tools: tools.map(publicTool),
        usage: 'POST a JSON-RPC 2.0 request to this same URL. Supported methods: initialize, tools/list, tools/call, ping.',
      });
    }

    if (req.method !== 'POST') return res.status(405).json(rpcError(null, -32600, 'POST or GET only'));

    let payload;
    try {
      payload = await readJsonBody(req);
    } catch {
      return res.status(400).json(rpcError(null, -32700, 'Parse error'));
    }
    if (!payload) return res.status(400).json(rpcError(null, -32600, 'Empty request'));

    res.setHeader('MCP-Protocol-Version', PROTOCOL_VERSION);
    res.setHeader('Cache-Control', 'no-store');

    // A batch is an array; notifications carry no id and get no response.
    if (Array.isArray(payload)) {
      const responses = [];
      for (const message of payload) {
        if (message?.id === undefined) continue;
        responses.push(await dispatch(message));
      }
      if (responses.length === 0) return res.status(202).end();
      return res.status(200).json(responses);
    }

    if (payload.id === undefined) return res.status(202).end();
    return res.status(200).json(await dispatch(payload));
  };
}
