// api/agent-router.js
// Universal agent router for ARBITRAGE

import receiptAgent from './agents/receipt-agent.js';
import settlementAgent from './agents/settlement-agent.js';
import rewardsAgent from './agents/rewards-agent.js';
import printableAgent from './agents/printable-agent.js';
import curbAlertAgent from './agents/curb-alert-agent.js';
import usertestingAgent from './agents/usertesting-agent.js';
import gigAgent from './agents/gig-agent.js';
import domainAgent from './agents/domain-agent.js';
import cashbackAgent from './agents/cashback-agent.js';
import priceDropAgent from './agents/price-drop-agent.js';
import focusGroupAgent from './agents/focus-group-agent.js';
import productTestAgent from './agents/product-test-agent.js';
import aiArtAgent from './agents/ai-art-agent.js';
import promoAgent from './agents/promo-agent.js';

const AGENTS = {
  receipt: receiptAgent,
  settlement: settlementAgent,
  rewards: rewardsAgent,
  printable: printableAgent,
  curb: curbAlertAgent,
  usertesting: usertestingAgent,
  gig: gigAgent,
  domain: domainAgent,
  cashback: cashbackAgent,
  price: priceDropAgent,
  focus: focusGroupAgent,
  product: productTestAgent,
  aiart: aiArtAgent,
  promo: promoAgent
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, params } = req.body;
    
    // Route to specific agent
    if (action === 'scan') {
      // Run all relevant agents based on user profile
      const results = await runRelevantAgents(params);
      return res.json(results);
    }
    
    if (action === 'execute' && params.category) {
      // Execute a specific agent
      const agent = AGENTS[params.category];
      if (!agent) {
        return res.status(400).json({ error: `Unknown category: ${params.category}` });
      }
      const result = await agent(params);
      return res.json(result);
    }
    
    if (action === 'get_draft') {
      // Get email/message draft for a specific opportunity
      const draft = await generateDraft(params);
      return res.json(draft);
    }
    
    return res.status(400).json({ error: 'Invalid action' });
    
  } catch (error) {
    console.error('Agent router error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function runRelevantAgents(userProfile) {
  const { skills, timeAvailable, hasCar, hasPrinter, location, riskTolerance } = userProfile;
  
  const agentsToRun = [];
  const results = {
    opportunities: [],
    drafts: [],
    summary: {
      totalMonthlyPotential: 0,
      fullyAutomatable: [],
      quickestWin: null
    }
  };
  
  // Determine which agents to run based on user profile
  if (hasPrinter || skills.includes('design')) {
    agentsToRun.push({ name: 'printable', agent: printableAgent });
  }
  
  if (hasCar && location) {
    agentsToRun.push({ name: 'curb', agent: curbAlertAgent });
  }
  
  if (skills.includes('writing') || skills.includes('marketing')) {
    agentsToRun.push({ name: 'gig', agent: gigAgent });
  }
  
  if (skills.includes('art') || skills.includes('design')) {
    agentsToRun.push({ name: 'aiart', agent: aiArtAgent });
  }
  
  // Always run these (universal)
  agentsToRun.push(
    { name: 'receipt', agent: receiptAgent },
    { name: 'settlement', agent: settlementAgent },
    { name: 'rewards', agent: rewardsAgent },
    { name: 'usertesting', agent: usertestingAgent },
    { name: 'cashback', agent: cashbackAgent },
    { name: 'price', agent: priceDropAgent },
    { name: 'promo', agent: promoAgent }
  );
  
  // Execute all selected agents in parallel
  const agentResults = await Promise.allSettled(
    agentsToRun.map(async ({ name, agent }) => {
      try {
        const result = await agent(userProfile);
        return { category: name, ...result };
      } catch (e) {
        console.error(`Agent ${name} failed:`, e);
        return null;
      }
    })
  );
  
  // Process results
  agentResults.forEach(r => {
    if (r.status === 'fulfilled' && r.value) {
      const data = r.value;
      if (data.opportunities) {
        results.opportunities.push(...data.opportunities);
      }
      if (data.draft) {
        results.drafts.push(data.draft);
      }
      if (data.monthlyPotential) {
        results.summary.totalMonthlyPotential += data.monthlyPotential;
      }
    }
  });
  
  // Sort opportunities by automation potential and earnings
  results.opportunities.sort((a, b) => {
    const autoRank = { high: 3, medium: 2, low: 1 };
    const aRank = autoRank[a.automationLevel] || 0;
    const bRank = autoRank[b.automationLevel] || 0;
    if (aRank !== bRank) return bRank - aRank;
    return (b.estimatedValue || 0) - (a.estimatedValue || 0);
  });
  
  results.summary.fullyAutomatable = results.opportunities
    .filter(o => o.automationLevel === 'high')
    .slice(0, 3)
    .map(o => o.title);
  
  results.summary.quickestWin = results.opportunities
    .sort((a, b) => (a.timeToMoney || 999) - (b.timeToMoney || 999))[0];
  
  return results;
}

async function generateDraft(params) {
  // Generate email/message draft based on opportunity type
  const { category, opportunityId, userInfo } = params;
  
  const templates = {
    gig: (opp) => ({
      subject: `Re: ${opp.title} - Experienced ${opp.skill} Available`,
      body: `Hi,\n\nI came across your post looking for a ${opp.topic} writer...`
    }),
    curb: (opp) => ({
      subject: `Re: ${opp.title} - Still available?`,
      body: `Hi, I can pick this up today if it's still available. What's your cross street?`
    }),
    // ... other templates
  };
  
  return templates[category] || { subject: 'Re: Opportunity', body: 'I'm interested...' };
}