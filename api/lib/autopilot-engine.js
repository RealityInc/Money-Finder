// api/lib/autopilot-engine.js
// Runtime for unattended, terms-compliant micro-revenue programs.

import { assessOpportunity, summarizePolicy, POLICY_VERSION } from './safety-policy.js';

const DEFAULT_PROGRAMS = [
  {
    id: 'elevenlabs-affiliate',
    title: 'ElevenLabs Creator Affiliate Program',
    category: 'affiliate',
    automationClass: 'affiliate_conversion',
    sourceUrl: 'https://elevenlabs.io/affiliates',
    landingUrl: 'https://elevenlabs.io/',
    trackingUrl: null,
    enrolled: false,
    enabled: false,
    payoutModel: 'Published recurring commission on qualifying subscriptions',
    requiresRecurringHumanWork: false,
    requiresApplicationPerOpportunity: false,
    requiresClaimPerOpportunity: false,
    requiresPurchaseOrCapital: false
  }
];

function parseConfiguredPrograms() {
  const raw = process.env.AUTOPILOT_PROGRAMS_JSON;
  if (!raw) return DEFAULT_PROGRAMS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('AUTOPILOT_PROGRAMS_JSON must be a JSON array');
    return parsed;
  } catch (error) {
    return DEFAULT_PROGRAMS.map(program => ({
      ...program,
      configWarning: error.message
    }));
  }
}

async function probeUrl(url) {
  if (!url) return { ok: false, status: null, reason: 'No URL configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Money-Finder-Autopilot/1.0 (+https://money-finder-nu.vercel.app)' }
    });
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url
    };
  } catch (error) {
    return { ok: false, status: null, reason: error.name === 'AbortError' ? 'Timeout' : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWebhook(payload) {
  const webhookUrl = process.env.AUTOPILOT_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: 'AUTOPILOT_WEBHOOK_URL is not configured' };

  const url = new URL(webhookUrl);
  if (url.protocol !== 'https:') {
    return { sent: false, reason: 'Webhook must use HTTPS' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-money-finder-event': 'autopilot.scan.completed'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    return { sent: response.ok, status: response.status };
  } catch (error) {
    return { sent: false, reason: error.name === 'AbortError' ? 'Timeout' : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runAutopilot({ deliver = true } = {}) {
  const startedAt = new Date().toISOString();
  const programs = parseConfiguredPrograms();

  const results = await Promise.all(programs.map(async program => {
    const assessment = assessOpportunity(program);
    const probeTarget = program.trackingUrl || program.sourceUrl || program.landingUrl;
    const probe = await probeUrl(probeTarget);

    return {
      ...program,
      assessment,
      probe,
      executable: Boolean(assessment.eligible && program.enabled && probe.ok)
    };
  }));

  const executable = results.filter(result => result.executable);
  const setupNeeded = results.filter(result => result.assessment.tier === 'setup');
  const rejected = results.filter(result => !result.assessment.eligible && result.assessment.tier !== 'setup');

  const payload = {
    engine: 'money-finder-autopilot',
    version: 1,
    policyVersion: POLICY_VERSION,
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: 'zero-touch',
    counts: summarizePolicy(results),
    executable,
    setupNeeded,
    rejected
  };

  const delivery = deliver ? await sendWebhook(payload) : { sent: false, reason: 'Dry run' };

  return { ...payload, delivery };
}

export function getAutopilotConfigStatus() {
  const programs = parseConfiguredPrograms();
  return {
    engine: 'money-finder-autopilot',
    mode: 'zero-touch',
    policyVersion: POLICY_VERSION,
    programCount: programs.length,
    webhookConfigured: Boolean(process.env.AUTOPILOT_WEBHOOK_URL),
    configuredPrograms: programs.map(program => ({
      id: program.id,
      title: program.title,
      category: program.category,
      enabled: Boolean(program.enabled),
      enrolled: Boolean(program.enrolled),
      trackingConfigured: Boolean(program.trackingUrl),
      assessment: assessOpportunity(program)
    }))
  };
}
