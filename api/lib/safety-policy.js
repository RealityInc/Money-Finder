// api/lib/safety-policy.js
// Guardrails for zero-touch monetization. The engine only auto-runs activities
// where the user has already enrolled and no recurring attestation or human work is required.

export const POLICY_VERSION = '2026-08-31';

const ALLOWED_AUTOMATION_CLASSES = new Set([
  'affiliate_conversion',
  'lead_fee',
  'ad_revenue',
  'digital_delivery',
  'licensing_royalty',
  'api_usage_fee'
]);

const BLOCKED_PATTERNS = [
  /fake\s+(account|identity|person|review)/i,
  /duplicate\s+claim/i,
  /settlement\s+claim/i,
  /class\s+action\s+claim/i,
  /rewards?\s+(farm|farming|bot|search)/i,
  /self[-\s]?refer/i,
  /click\s+farm/i,
  /captcha\s+bypass/i,
  /credential\s+stuff/i,
  /craigslist.*scrap/i,
  /bulk.*apply/i,
  /mass.*application/i,
  /impersonat/i
];

export function assessOpportunity(opportunity = {}) {
  const text = JSON.stringify(opportunity);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        eligible: false,
        tier: 'blocked',
        reason: 'Blocked by the zero-touch safety policy.'
      };
    }
  }

  if (opportunity.requiresRecurringHumanWork) {
    return { eligible: false, tier: 'manual', reason: 'Requires recurring human work.' };
  }

  if (opportunity.requiresApplicationPerOpportunity) {
    return { eligible: false, tier: 'manual', reason: 'Requires a separate application or representation each time.' };
  }

  if (opportunity.requiresClaimPerOpportunity) {
    return { eligible: false, tier: 'manual', reason: 'Requires a separate claim or eligibility attestation each time.' };
  }

  if (opportunity.requiresPurchaseOrCapital) {
    return { eligible: false, tier: 'capital', reason: 'Requires a purchase, deposit, or capital deployment.' };
  }

  if (!ALLOWED_AUTOMATION_CLASSES.has(opportunity.automationClass)) {
    return { eligible: false, tier: 'watch', reason: 'Useful to monitor, but not eligible for unattended execution.' };
  }

  if (!opportunity.enrolled) {
    return { eligible: false, tier: 'setup', reason: 'One-time enrollment or payout setup is still required.' };
  }

  if (!opportunity.trackingUrl && opportunity.automationClass === 'affiliate_conversion') {
    return { eligible: false, tier: 'setup', reason: 'Affiliate tracking URL is not configured.' };
  }

  return {
    eligible: true,
    tier: 'autopilot',
    reason: 'Eligible for zero-touch operation after completed enrollment.'
  };
}

export function summarizePolicy(results = []) {
  return results.reduce(
    (summary, result) => {
      const tier = result.assessment?.tier || 'watch';
      summary[tier] = (summary[tier] || 0) + 1;
      return summary;
    },
    { autopilot: 0, setup: 0, manual: 0, capital: 0, watch: 0, blocked: 0 }
  );
}
