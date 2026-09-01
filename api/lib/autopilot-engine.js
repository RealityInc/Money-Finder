// api/lib/autopilot-engine.js
// Runtime for unattended, terms-compliant micro-revenue programs.

import { assessOpportunity, summarizePolicy, POLICY_VERSION } from './safety-policy.js';
import { getLearningGraph, rankRecommendations, GRAPH_VERSION } from './learning-graph.js';

const ORIGIN = 'https://milliapi.com';

const X402_PROGRAMS = [
  {
    id: 'ai-robots-x402',
    graphServiceId: 'service:ai_robots',
    title: 'AI Robots Policy Check API',
    category: 'api', automationClass: 'api_usage_fee',
    sourceUrl: `${ORIGIN}/api/ai-robots-check?url=https%3A%2F%2Fexample.com`,
    landingUrl: `${ORIGIN}/api/ai-robots-check`,
    enrolled: true, enabled: true, expectedStatus: 402,
    payoutModel: '$0.001 per successful x402 API call',
    requiresRecurringHumanWork: false, requiresApplicationPerOpportunity: false,
    requiresClaimPerOpportunity: false, requiresPurchaseOrCapital: false
  },
  {
    id: 'llms-txt-x402',
    graphServiceId: 'service:llms_txt',
    title: 'llms.txt Check API',
    category: 'api', automationClass: 'api_usage_fee',
    sourceUrl: `${ORIGIN}/api/llms-txt-check?url=https%3A%2F%2Fexample.com`,
    landingUrl: `${ORIGIN}/api/llms-txt-check`,
    enrolled: true, enabled: true, expectedStatus: 402,
    payoutModel: '$0.001 per successful x402 API call',
    requiresRecurringHumanWork: false, requiresApplicationPerOpportunity: false,
    requiresClaimPerOpportunity: false, requiresPurchaseOrCapital: false
  },
  {
    id: 'page-metadata-x402',
    graphServiceId: 'service:metadata',
    title: 'Page Metadata Extractor API',
    category: 'api', automationClass: 'api_usage_fee',
    sourceUrl: `${ORIGIN}/api/page-metadata?url=https%3A%2F%2Fexample.com`,
    landingUrl: `${ORIGIN}/api/page-metadata`,
    enrolled: true, enabled: true, expectedStatus: 402,
    payoutModel: '$0.002 per successful x402 API call',
    requiresRecurringHumanWork: false, requiresApplicationPerOpportunity: false,
    requiresClaimPerOpportunity: false, requiresPurchaseOrCapital: false
  },
  {
    id: 'web-readiness-x402',
    graphServiceId: 'service:web_audit',
    title: 'AI Web Readiness Audit API',
    category: 'api', automationClass: 'api_usage_fee',
    sourceUrl: `${ORIGIN}/api/agent-web-audit?url=https%3A%2F%2Fexample.com`,
    landingUrl: `${ORIGIN}/api/agent-web-audit`,
    enrolled: true, enabled: true, expectedStatus: 402,
    payoutModel: '$0.005 per successful x402 API call',
    requiresRecurringHumanWork: false, requiresApplicationPerOpportunity: false,
    requiresClaimPerOpportunity: false, requiresPurchaseOrCapital: false
  }
];

const DEFAULT_PROGRAMS = [
  ...X402_PROGRAMS,
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
    return DEFAULT_PROGRAMS.map(program => ({ ...program, configWarning: error.message }));
  }
}

async function probeUrl(url, expectedStatus = 200) {
  if (!url) return { ok: false, status: null, reason: 'No URL configured' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'GET', redirect: 'follow', signal: controller.signal,
      headers: { 'user-agent': `MilliAPI-Autopilot/2.0 (+${ORIGIN})` }
    });
    return {
      ok: response.status === expectedStatus || (expectedStatus === 200 && response.ok),
      status: response.status,
      expectedStatus,
      finalUrl: response.url,
      paymentRequired: response.status === 402 && Boolean(response.headers.get('payment-required'))
    };
  } catch (error) {
    return { ok: false, status: null, expectedStatus, reason: error.name === 'AbortError' ? 'Timeout' : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWebhook(payload) {
  const webhookUrl = process.env.AUTOPILOT_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: 'AUTOPILOT_WEBHOOK_URL is not configured' };
  const url = new URL(webhookUrl);
  if (url.protocol !== 'https:') return { sent: false, reason: 'Webhook must use HTTPS' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-money-finder-event': 'autopilot.scan.completed' },
      body: JSON.stringify(payload), signal: controller.signal
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
  const graph = getLearningGraph();
  const graphRecommendations = rankRecommendations(graph).slice(0, 8);

  const results = await Promise.all(programs.map(async program => {
    const assessment = assessOpportunity(program);
    const probeTarget = program.trackingUrl || program.sourceUrl || program.landingUrl;
    const probe = await probeUrl(probeTarget, program.expectedStatus || 200);
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
    version: 2,
    policyVersion: POLICY_VERSION,
    graphVersion: GRAPH_VERSION,
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: 'zero-touch',
    counts: summarizePolicy(results),
    x402Health: results.filter(result => result.category === 'api').map(result => ({
      id: result.id,
      serviceId: result.graphServiceId || null,
      status: result.probe.status,
      expectedStatus: result.probe.expectedStatus,
      paymentRequired: Boolean(result.probe.paymentRequired),
      healthy: result.probe.ok
    })),
    learning: {
      topRecommendations: graphRecommendations,
      guardrails: graph.guardrails
    },
    executable,
    setupNeeded,
    rejected
  };

  const delivery = deliver ? await sendWebhook(payload) : { sent: false, reason: 'Dry run' };
  return { ...payload, delivery };
}

export function getAutopilotConfigStatus() {
  const programs = parseConfiguredPrograms();
  const graph = getLearningGraph();
  return {
    engine: 'money-finder-autopilot',
    mode: 'zero-touch',
    version: 2,
    policyVersion: POLICY_VERSION,
    graphVersion: GRAPH_VERSION,
    programCount: programs.length,
    webhookConfigured: Boolean(process.env.AUTOPILOT_WEBHOOK_URL),
    learningGraph: {
      endpoint: '/api/learning-graph',
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      topRecommendations: rankRecommendations(graph).slice(0, 5)
    },
    configuredPrograms: programs.map(program => ({
      id: program.id,
      title: program.title,
      category: program.category,
      enabled: Boolean(program.enabled),
      enrolled: Boolean(program.enrolled),
      trackingConfigured: Boolean(program.trackingUrl),
      expectedStatus: program.expectedStatus || 200,
      assessment: assessOpportunity(program)
    }))
  };
}
