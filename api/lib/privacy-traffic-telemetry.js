import { createHmac } from 'node:crypto';
import { persistIntelligenceEvent } from './mo-core.js';

function secret() {
  return process.env.TELEMETRY_SALT || process.env.CDP_API_KEY_SECRET || process.env.CDP_API_KEY_ID || 'milliapi-telemetry-fallback';
}

function uaFamily(ua='') {
  const value=String(ua).toLowerCase();
  if(value.includes('x402')) return 'x402-client';
  if(value.includes('curl')) return 'curl';
  if(value.includes('python')) return 'python';
  if(value.includes('node')) return 'node';
  if(value.includes('go-http-client')) return 'go-http-client';
  if(value.includes('postman')) return 'postman';
  if(value.includes('vercel')) return 'vercel';
  return value ? 'other' : 'unknown';
}

function identity(req) {
  const day=new Date().toISOString().slice(0,10);
  const forwarded=String(req.get?.('x-forwarded-for')||'').split(',')[0].trim();
  const ip=String(req.ip||forwarded||req.get?.('x-real-ip')||'unknown');
  const ua=String(req.get?.('user-agent')||'');
  const id=createHmac('sha256',secret()).update(`${day}|${ip}|${ua}`).digest('hex').slice(0,24);
  return { clientId:id, clientDay:day, uaFamily:uaFamily(ua) };
}

function paymentPresent(req) {
  return Boolean(req.get?.('PAYMENT-SIGNATURE') || req.get?.('X-PAYMENT') || req.get?.('X-PAYMENT-SIGNATURE'));
}

function emit(req, fields) {
  const event={
    telemetry:'x402_funnel_v1',
    service:'MilliAPI',
    at:new Date().toISOString(),
    ...identity(req),
    vertical:'api-data-economy',
    ...fields,
  };
  console.log(JSON.stringify(event));
  return event;
}

export async function observePaidRoute(req,res,{route,method='GET',amount=null}={}) {
  if(req.method!==method) return;
  const paymentAttempt=paymentPresent(req);
  if(!paymentAttempt) {
    const event=emit(req,{route,stage:'challenge',status:402,paymentAttempt:false,amount});
    await persistIntelligenceEvent(req,event,{timeoutMs:500});
    return;
  }

  const started=emit(req,{route,stage:'payment_attempt_started',status:null,paymentAttempt:true,amount});
  await persistIntelligenceEvent(req,started,{timeoutMs:500});

  res.once('finish',()=>{
    const status=Number(res.statusCode||0);
    const succeeded=status>=200&&status<300;
    const event=emit(req,{
      route,
      stage:succeeded?'settled':'payment_attempt_failed',
      status,
      paymentAttempt:true,
      amount,
    });
    // Successful settlements are persisted by the awaited x402 onAfterSettle hook,
    // avoiding double-counting. Failed attempts have no settlement hook, so keep a
    // best-effort persistence path for those.
    if(!succeeded) void persistIntelligenceEvent(req,event,{timeoutMs:1000});
  });
}

export function observeFreeRoute(req,res,{route,stage='free_explore'}={}) {
  res.once('finish',()=>{
    const event=emit(req,{route,stage,status:Number(res.statusCode||0),paymentAttempt:false});
    void persistIntelligenceEvent(req,event,{timeoutMs:1000});
  });
}
