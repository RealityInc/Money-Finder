// api/agents/gig-agent.js
// Gig helper. It deliberately does not scrape Craigslist or mass-submit applications.
// Jobs must be supplied by a permitted upstream source or by the user.

export default async function gigAgent(params = {}) {
  const jobs = Array.isArray(params.jobs) ? params.jobs : [];
  const skills = Array.isArray(params.skills) ? params.skills : [];

  const opportunities = jobs
    .filter(job => job && job.title)
    .map((job, index) => {
      const draft = generateGigDraft(job, params);
      return {
        id: job.id || `gig_${index + 1}`,
        category: 'gig',
        title: job.title,
        description: job.description || '',
        platform: job.platform || 'provided source',
        estimatedValue: Number(job.estimatedPay || 0),
        automationLevel: 'low',
        zeroTouchEligible: false,
        humanTaskRequired: 'Review the opportunity, submit truthfully, and complete the paid work.',
        actionItem: { type: 'draft_only', ...draft },
        tags: ['gig', 'manual-work', ...skills.slice(0, 2)]
      };
    });

  return {
    opportunities,
    monthlyPotential: 0,
    agent: 'gig-agent',
    status: 'success',
    note: 'Gig applications are intentionally excluded from zero-touch execution.'
  };
}

function generateGigDraft(job, params) {
  const name = params.name || '[Your Name]';
  const portfolio = params.portfolio || '[Portfolio Link]';
  const subject = `Re: ${job.title}`;
  const body = `Hi,\n\nI’m interested in ${job.title}. My background appears relevant to what you’re looking for, and I’d be happy to share the most applicable samples.\n\nIf the scope and timing are still current, I can take a closer look and confirm fit.\n\nBest,\n${name}\n${portfolio}`;
  return { subject, body };
}
