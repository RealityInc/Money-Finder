// api/autopilot.js

import { getAutopilotConfigStatus, runAutopilot } from './lib/autopilot-engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json(getAutopilotConfigStatus());
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  const dryRun = req.body?.dryRun !== false;
  const result = await runAutopilot({ deliver: !dryRun });
  return res.status(200).json(result);
}
