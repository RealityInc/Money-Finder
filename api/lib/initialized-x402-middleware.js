import { paymentMiddlewareFromHTTPServer } from '@x402/express';
import { PAYMENT_PHASE, explainExpressSettlementError } from './x402-settlement-failure.js';

// Own the same lazy initialization boundary as the pinned SDK, so failure phase
// is observable without interpreting an error string. A rejected promise clears
// for a later request; there is no retry or timeout change within this request.
export function initializedX402Middleware(httpServer, paywallConfig, options) {
  let initialized=false;
  let pending=null;
  const middleware=paymentMiddlewareFromHTTPServer(httpServer,paywallConfig,undefined,false);
  return async(req,res,next)=>{
    if(!initialized){
      if(!pending) pending=Promise.resolve().then(()=>httpServer.initialize());
      const attempt=pending;
      try { await attempt; initialized=true; }
      catch(error){
        if(pending===attempt) pending=null;
        req[PAYMENT_PHASE]='initialization_failed_before_verification';
        if(explainExpressSettlementError(req,res,error,options)) return;
        return next(error);
      }
    }
    req[PAYMENT_PHASE]='request_pipeline_entered';
    return middleware(req,res,next);
  };
}
