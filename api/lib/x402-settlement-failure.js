/**
 * PORTABLE — copied from the Machine Observer baseline.
 *
 * Source of truth: Machine-Economy lib/x402-settlement-failure.js.
 * Change it there first, then carry the change here.
 *
 * The classification below is identical to the baseline. What differs is the writer: MilliAPI's paid
 * routes are Express, so the failure is written onto `res` rather than returned as a Response.
 */

/**
 * Turns a failed paid request into something a buyer can act on.
 *
 * The unpaid path already degrades well: when a dependency is down it answers no-charge and says so.
 * The paid path did not. A payment presented while the facilitator was unreachable produced a bare
 * 500 whose whole body is {"error":"Internal Server Error"}: the buyer has already signed, and cannot
 * tell from that whether it was charged, whether to retry, or whether the seller is simply broken.
 * Clients that see that reasonably stop trying.
 *
 * The only question that matters to a buyer is whether money moved, and the honest answer has three
 * values, not two:
 *
 *   charged=false  Settlement provably never began, so a retry is free. We only claim this when we
 *                  can show it: the resource server has no payment kinds loaded, meaning it never
 *                  reached a facilitator, or the error names the transport failure that stopped it.
 *   charged=true   A settlement receipt is on the failed response. The buyer paid and did not get
 *                  the goods, which is the case worth naming rather than hiding in a generic error.
 *   charged=null   Anything else. An opaque server error is genuinely ambiguous and is reported as
 *                  ambiguous, because telling a buyer it was not charged when it might have been is
 *                  worse than admitting we do not know.
 *
 * Deliberately NOT treated as proof of no charge: the bare string "Internal Server Error", and HTTP
 * 5xx on its own. The x402 middleware answers with that identical body whether the facilitator failed
 * to initialize (not charged), the request blew up during processing (not charged), or the route
 * handler failed after the payment settled (charged).
 */

// Errors that name the reason settlement could not be attempted at all.
const NOT_SETTLED_PATTERNS = [
  /failed to initialize/i,
  /no supported payment kinds/i,
  /facilitator/i,
  /fetch failed/i,
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i,
  /invalid key format/i,
  /missing.*(CDP|API key|credential)/i,
];

const SETTLEMENT_RECEIPT_HEADERS = ['PAYMENT-RESPONSE', 'X-PAYMENT-RESPONSE'];

/** True when a settlement receipt is already on the response, meaning the payment was captured. */
export function hasSettlementReceipt(res) {
  if (!res) return false;
  for (const name of SETTLEMENT_RECEIPT_HEADERS) {
    const value = typeof res.getHeader === 'function' ? res.getHeader(name) : res.headers?.[name.toLowerCase()];
    if (value) return true;
  }
  return false;
}

/**
 * Asks the x402 resource server whether it ever loaded the payment kind this route sells.
 *
 * This is the evidence behind a charged=false claim and it costs no network call: the middleware has
 * already tried to initialize by the time we look. An empty answer means no facilitator responded, so
 * no payment could have been verified, let alone settled. Anything unexpected returns null — unknown —
 * rather than guessing in the buyer's favour.
 */
export function settlementCapabilityLoaded(resourceServer, { x402Version = 2, network, scheme = 'exact' } = {}) {
  try {
    if (typeof resourceServer?.getSupportedKind !== 'function') return null;
    for (const version of [x402Version, 1, 2]) {
      if (resourceServer.getSupportedKind(version, network, scheme)) return true;
    }
    return false;
  } catch {
    return null;
  }
}

export function classifySettlementFailure(error, { capabilityLoaded = null, settled = false } = {}) {
  const message = String(error?.message || error || '');
  if (settled) return { charged:true, reason:'settled_but_undelivered', message };
  if (capabilityLoaded === false || NOT_SETTLED_PATTERNS.some((pattern) => pattern.test(message))) {
    return { charged:false, reason:'settlement_unavailable', message };
  }
  return { charged:null, reason:'settlement_failed', message };
}

const GUIDANCE = {
  settlement_unavailable:'Settlement could not be attempted, so no payment was taken. The same request can be retried; send an Idempotency-Key so a later success is not double-charged.',
  settled_but_undelivered:'The payment settled but the result could not be returned. Do not pay again. Retry the same request with the same Idempotency-Key, and if it still fails the settlement receipt in PAYMENT-RESPONSE identifies the transaction to refund.',
  settlement_failed:'The payment was not settled. MilliAPI cannot confirm from here whether it was captured, so treat the charge as unknown and check the payer wallet before retrying.',
};

// 503 says "come back, this is ours and it is temporary". 502 says "the payment landed, the delivery
// did not". 402 keeps a genuinely ambiguous failure inside the payment conversation.
const STATUS = { settlement_unavailable:503, settled_but_undelivered:502, settlement_failed:402 };

export function settlementFailureBody(error, { route = null, priceUsd = null, retryUrl = null, capabilityLoaded = null, settled = false } = {}) {
  const { charged, reason, message } = classifySettlementFailure(error, { capabilityLoaded, settled });
  const notCharged = charged === false;
  return {
    status:STATUS[reason],
    reason,
    charged,
    headers:{
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Expose-Headers':'X-Settlement-Status, X-Charged, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE',
      'X-Settlement-Status':reason,
      'X-Charged':String(charged),
      'Cache-Control':'private, no-store',
      ...(notCharged ? { 'Retry-After':'30' } : {}),
    },
    body:{
      error:reason,
      settled:charged === true,
      charged,
      noCharge:notCharged,
      retryable:notCharged || charged === true,
      route,
      priceUsd,
      retryUrl,
      buyerGuidance:GUIDANCE[reason],
      // The detail is safe to publish: it names which dependency failed, not any credential.
      detail:message.slice(0, 300),
    },
  };
}

/**
 * Rewrites an opaque 5xx from the x402 middleware, or from a handler that ran after settlement, into
 * an answer that states the charge state.
 *
 * Install this before the payment middleware. It patches the response writer rather than wrapping the
 * middleware because the Express middleware writes to `res` directly and never returns the response.
 * It is a no-op for anything that is not a server error and for requests carrying no payment: an
 * unpaid caller that hits a broken route has not committed anything, so its 500 is a different
 * problem and must not be dressed up as a payment outcome.
 */
function presentedPayment(req) {
  const headers = req?.headers || {};
  return Boolean(headers['payment-signature'] || headers['x-payment'] || headers['x-payment-signature']);
}

export function guardSettlementFailure(req, res, { resourceServer = null, network, route = null, priceUsd = null, retryUrl = null } = {}) {
  if (res.__settlementGuardInstalled || !presentedPayment(req)) return;
  res.__settlementGuardInstalled = true;

  const json = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode < 500) return json(payload);
    const settled = hasSettlementReceipt(res);
    const capabilityLoaded = settlementCapabilityLoaded(resourceServer, { network, scheme:'exact' });
    const detail = payload?.error || payload?.message || `paid handler returned HTTP ${res.statusCode}`;
    const failure = settlementFailureBody(new Error(String(detail)), { route, priceUsd, retryUrl, capabilityLoaded, settled });
    res.status(failure.status);
    for (const [name, value] of Object.entries(failure.headers)) res.setHeader(name, value);
    return json(failure.body);
  };
}
