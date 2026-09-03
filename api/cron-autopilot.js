// api/cron-autopilot.js
// Scheduled zero-touch scan plus bounded MilliAPI/Church stewardship.
//
// When CRON_SECRET is configured, Vercel sends it as a Bearer token and the
// engine may deliver approved, already-enrolled opportunities downstream.
// The Steward itself never authorizes spending or changes wallet/pricing policy.

import { runAutopilot } from './lib/autopilot-engine.js';
import { runMilliSteward } from './lib/steward.js';

const EXPECTED_SCHEDULE = '17 */6 * * *';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const scheduleHeader = req.headers['x-vercel-cron-schedule'];
  const secureMode = Boolean(cronSecret);
  const authorized = secureMode ? authHeader === `Bearer ${cronSecret}` : scheduleHeader === EXPECTED_SCHEDULE;
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [result, steward] = await Promise.all([
      runAutopilot({ deliver: secureMode }),
      runMilliSteward()
    ]);
    return res.status(steward.status === 'red' ? 503 : 200).json({
      ok: steward.status !== 'red',
      mode: secureMode ? 'active' : 'read-only',
      finishedAt: result.finishedAt,
      counts: result.counts,
      delivery: result.delivery,
      steward: {
        role: steward.role,
        status: steward.status,
        checkedAt: steward.checkedAt,
        healthySurfaces: steward.healthySurfaces,
        surfacesChecked: steward.surfacesChecked,
        findings: steward.findings
      }
    });
  } catch (error) {
    console.error('Autopilot/Steward cron failed:', error);
    return res.status(500).json({ ok: false, error: 'scheduled_maintenance_failed' });
  }
}
