// api/cron-autopilot.js
// Scheduled zero-touch scan. Vercel automatically sends CRON_SECRET as a Bearer token.

import { runAutopilot } from './lib/autopilot-engine.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runAutopilot({ deliver: true });
    return res.status(200).json({
      ok: true,
      finishedAt: result.finishedAt,
      counts: result.counts,
      delivery: result.delivery
    });
  } catch (error) {
    console.error('Autopilot cron failed:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
