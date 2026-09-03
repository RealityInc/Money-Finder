// Shared helpers for exercising Vercel-style handlers without a server.

export function invoke(handler, { method = 'GET', query = {}, headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const lower = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
    const req = {
      method,
      query,
      body,
      headers: lower,
      url: '/',
      get(name) { return lower[String(name).toLowerCase()] ?? null; },
    };
    let status = 200;
    const sent = {};
    const res = {
      setHeader(name, value) { sent[String(name).toLowerCase()] = value; },
      getHeader(name) { return sent[String(name).toLowerCase()]; },
      status(code) { status = code; return res; },
      json(value) { resolve({ status, body: value, headers: sent }); return res; },
      send(value) { resolve({ status, body: value, headers: sent }); return res; },
      end() { resolve({ status, body: null, headers: sent }); return res; },
    };
    try { handler(req, res); } catch (error) { reject(error); }
  });
}

export function rpc(handler, message) {
  return invoke(handler, { method: 'POST', body: message, headers: { 'content-type': 'application/json' } });
}
