// api/cron-autopilot.js
// Scheduled zero-touch scan.
//
// When CRON_SECRET is configured, Vercel sends it as a Bearer token and the
// engine may deliver approved, already-enrolled opportunities downstream.
// Before that one-time setup exists, the scheduled Vercel invocation is
// permitted to run in read-only mode only: it can assess/probe programs but
// cannot deliver, execute, submit, claim, purchase, or move money.

import { runAutopilot } from './lib/autopilot-engine.js';

const EXPECTED_SCHEDULE = '17 */6 * * *';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const scheduleHeader = req.headers['x-vercel-cron-schedule'];
  const secureMode = Boolean(cronSecret);

  const authorized = secureMode
    ? authHeader === `Bearer ${cronSecret}`
    : scheduleHeader === EXPECTED_SCHEDULE;

  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runAutopilot({ deliver: secureMode });
    return res.status(200).json({
      ok: true,
      mode: secureMode ? 'active' : 'read-only',
      finishedAt: result.finishedAt,
      counts: result.counts,
      delivery: result.delivery
    });
  } catch (error) {
    console.error('Autopilot cron failed:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
