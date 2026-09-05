const PAYMENT_HEADERS = ['payment-signature', 'x-payment', 'x-payment-signature'];
const RECEIPT_HEADERS = ['payment-response', 'x-payment-response'];
const GUARD = Symbol.for('milliapi.x402SettlementFailureGuard');

function paymentPresented(req) {
  return PAYMENT_HEADERS.some((name) => Boolean(req.get?.(name) || req.headers?.[name]));
}

function settlementReceipt(res) {
  for (const name of RECEIPT_HEADERS) {
    const value = res.getHeader?.(name) || res.getHeader?.(name.toUpperCase());
    if (value) return String(value);
  }
  return null;
}

function retryUrl(req, route) {
  const proto = String(req.get?.('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = req.get?.('host') || 'milliapi.com';
  const original = req.originalUrl || req.url || route || '/';
  try {
    return new URL(original, `${proto}://${host}`).toString();
  } catch {
    return `https://milliapi.com${route || ''}`;
  }
}

function failurePayload(req, res, { route, priceUsd, detail = '' } = {}) {
  const receipt = settlementReceipt(res);
  if (receipt) {
    return {
      status:502,
      headers:{ 'X-Settlement-Status':'settled_but_undelivered', 'X-Charged':'true' },
      body:{
        error:'settled_but_undelivered', settled:true, charged:true, noCharge:false, retryable:true,
        route:route || null, priceUsd:priceUsd ?? null, retryUrl:retryUrl(req, route),
        buyerGuidance:'The payment settled but the result could not be returned. Do not pay again. Retry the exact request with the same Idempotency-Key; the PAYMENT-RESPONSE receipt identifies the transaction.',
        detail:String(detail || '').slice(0,300),
      },
    };
  }
  return {
    status:500,
    headers:{ 'X-Settlement-Status':'settlement_failed', 'X-Charged':'null' },
    body:{
      error:'settlement_failed', settled:false, charged:null, noCharge:false, retryable:false,
      route:route || null, priceUsd:priceUsd ?? null, retryUrl:retryUrl(req, route),
      buyerGuidance:'The settlement outcome could not be confirmed. Treat the charge as unknown, check the payer wallet before retrying, and do not interpret this response as a fresh payment request.',
      detail:String(detail || '').slice(0,300),
    },
  };
}

function applyFailure(res, failure) {
  if (res.headersSent) return false;
  res.statusCode = failure.status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Expose-Headers','X-Settlement-Status, X-Charged, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE');
  for (const [name,value] of Object.entries(failure.headers)) res.setHeader(name,value);
  return true;
}

/**
 * Express adaptation of the Machine Observer post-signature invariant.
 *
 * MilliAPI cannot safely infer `charged:false` from facilitator capability the way the Next.js
 * baseline can, so this adapter is deliberately conservative: a 5xx with no settlement receipt is
 * `charged:null`, never a free retry. A receipt proves the payment landed and becomes a 502 that tells
 * the buyer not to pay again. Crucially, neither case returns 402, which could be misread as a fresh
 * payment challenge.
 */
export function protectExpressSettlementResponse(req, res, { route = null, priceUsd = null } = {}) {
  if (!paymentPresented(req) || res[GUARD]) return;
  res[GUARD] = true;
  const originalSend = res.send.bind(res);
  res.send = function guardedSend(body) {
    if (res.statusCode >= 500 && !res.getHeader('X-Settlement-Status')) {
      const failure = failurePayload(req,res,{route,priceUsd,detail:typeof body === 'string' ? body : JSON.stringify(body || {})});
      if (applyFailure(res,failure)) return originalSend(JSON.stringify(failure.body));
    }
    return originalSend(body);
  };
}

export function explainExpressSettlementError(req, res, error, { route = null, priceUsd = null } = {}) {
  if (!paymentPresented(req) || res.headersSent) return false;
  const failure = failurePayload(req,res,{route,priceUsd,detail:error?.message || error});
  if (!applyFailure(res,failure)) return false;
  res.end(JSON.stringify(failure.body));
  return true;
}
