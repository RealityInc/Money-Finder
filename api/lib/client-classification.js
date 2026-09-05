const INDEXER_TOKENS = ['scan','index','directory','bazaar','catalog','registry','crawler','spider','bot/','bot ','googlebot','bingbot'];
const MONITOR_TOKENS = ['monitor','uptime','probe','healthcheck','health-check','pingdom','statuspage','watchdog','checkly','betterstack'];
const BROWSER_TOKENS = ['mozilla','chrome','safari','firefox','edge/'];
const TOOL_TOKENS = ['curl','python','node','go-http-client','postman','vercel'];

export function uaFamily(ua = '') {
  const value = String(ua).toLowerCase();
  if (value.includes('curl')) return 'curl';
  if (value.includes('python')) return 'python';
  if (value.includes('node')) return 'node';
  if (value.includes('go-http-client')) return 'go-http-client';
  if (value.includes('postman')) return 'postman';
  if (value.includes('vercel')) return 'vercel';
  if (value.includes('x402')) return 'x402-ua-mention';
  return value ? 'other' : 'unknown';
}

export function clientKind(ua = '', paying = false) {
  if (paying) return 'buyer';
  const value = String(ua).toLowerCase();
  if (!value) return 'unknown';
  if (MONITOR_TOKENS.some((token) => value.includes(token))) return 'monitor';
  if (INDEXER_TOKENS.some((token) => value.includes(token))) return 'indexer';
  if (BROWSER_TOKENS.some((token) => value.includes(token))) return 'browser';
  if (TOOL_TOKENS.some((token) => value.includes(token))) return 'tool';
  return 'unattributed';
}

export function isAutomatedDiscovery(kind) {
  return kind === 'indexer' || kind === 'monitor';
}
