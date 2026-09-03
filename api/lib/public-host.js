const HOSTS={
  church:{origin:'https://church402.org',kind:'church'},
  agentChurch:{origin:'https://402church.org',kind:'agent-church'},
  milli:{origin:'https://milliapi.com',kind:'milliapi'}
};

export function publicHost(req={}){
  const raw=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();
  const host=raw.split(',')[0].trim().split(':')[0];
  if(host==='church402.org'||host==='www.church402.org') return HOSTS.church;
  if(host==='402church.org'||host==='www.402church.org') return HOSTS.agentChurch;
  return HOSTS.milli;
}
