// api/agent-router.js
// Thin router retained for backwards compatibility with the original ARBITRAGE UI.

import gigAgent from './agents/gig-agent.js';
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

  try {
    const { action, params = {} } = req.body || {};

    if (action === 'autopilot' || action === 'scan_zero_touch') {
      const result = await runAutopilot({ deliver: Boolean(params.deliver) });
      return res.status(200).json(result);
    }

    if (action === 'execute' && params.category === 'gig') {
      const result = await gigAgent(params);
      return res.status(200).json(result);
    }

    return res.status(400).json({
      error: 'Unsupported action',
      supported: ['autopilot', 'scan_zero_touch', 'execute:gig']
    });
  } catch (error) {
    console.error('Agent router error:', error);
    return res.status(500).json({ error: error.message });
  }
}
