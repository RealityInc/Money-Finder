// api/agents/gig-agent.js
// Handles Craigslist, Upwork, Fiverr gig auto-responding

export default async function gigAgent(userProfile) {
  const { location = 'austin', skills = [], platforms = ['craigslist'] } = userProfile;
  
  const opportunities = [];
  let monthlyPotential = 0;
  
  // Determine which gig types to search
  const gigTypes = [];
  if (skills.includes('writing')) gigTypes.push('writing', 'copywriting', 'blogging');
  if (skills.includes('design')) gigTypes.push('graphic design', 'logo design');
  if (skills.includes('social')) gigTypes.push('social media', 'instagram');
  
  for (const platform of platforms) {
    if (platform === 'craigslist') {
      const craigslistGigs = await scrapeCraigslistGigs(location, gigTypes);
      
      craigslistGigs.forEach(gig => {
        if (gig.payMentioned && gig.estimatedPay > 20) {
          const emailDraft = generateGigEmail(gig, userProfile);
          
          opportunities.push({
            id: `gig_${Date.now()}_${Math.random().toString(36)}`,
            category: 'gig',
            title: gig.title,
            description: gig.description,
            platform: 'Craigslist',
            estimatedValue: gig.estimatedPay,
            timeToMoney: '1-7 days',
            automationLevel: 'medium',
            humanTaskRequired: 'Review and send email draft, then complete the work',
            actionItem: {
              type: 'email_draft',
              to: gig.replyEmail,
              subject: emailDraft.subject,
              body: emailDraft.body,
              mailtoLink: emailDraft.mailtoLink
            },
            tags: ['gig', 'freelance', skills[0]]
          });
          
          monthlyPotential += gig.estimatedPay * 2; // Assume 2 gigs per month
        }
      });
    }
    
    if (platform === 'upwork') {
      // Upwork RSS feed scraper
      // Similar logic
    }
  }
  
  return {
    opportunities,
    monthlyPotential,
    agent: 'gig-agent',
    status: 'success'
  };
}

function scrapeCraigslistGigs(location, gigTypes) {
  // In production: Use Apify actor or ScrapingBee
  // For now, return mock data
  
  const mockGigs = [
    {
      title: 'Need blog writer for HVAC company',
      description: 'Looking for writer to create 5 blog posts about energy efficiency. SEO knowledge a plus.',
      payMentioned: true,
      estimatedPay: 75,
      replyEmail: 'jobs@example.com',
      topic: 'HVAC',
      postedDate: new Date().toISOString()
    },
    {
      title: 'Social media manager for fitness brand',
      description: 'Need 10 posts per week for Instagram and TikTok. Fitness knowledge required.',
      payMentioned: true,
      estimatedPay: 200,
      replyEmail: 'hiring@fitbrand.com',
      topic: 'Fitness',
      postedDate: new Date().toISOString()
    },
    {
      title: 'Copywriter for SaaS landing page',
      description: 'Conversion-focused copy for new product launch. Tech experience needed.',
      payMentioned: true,
      estimatedPay: 300,
      replyEmail: 'marketing@saas.com',
      topic: 'SaaS',
      postedDate: new Date().toISOString()
    }
  ];
  
  return mockGigs.filter(gig => 
    gigTypes.some(type => 
      gig.title.toLowerCase().includes(type) || 
      gig.description.toLowerCase().includes(type)
    )
  );
}

function generateGigEmail(gig, userProfile) {
  const subject = `Re: ${gig.title} - Experienced Writer Available Immediately`;
  const body = `Hi,

I saw your post looking for a ${gig.topic} writer and I'm very interested.

I have experience writing in this niche and can provide relevant samples. I'm available to start today and can meet quick turnaround times.

A few quick questions:
- What's the total word count needed?
- Do you have a style guide or tone preference?
- What's your budget range?

Happy to do a paid test piece if that helps establish fit.

Best,
[Your Name]
[Portfolio Link]`;

  return {
    subject,
    body,
    mailtoLink: `mailto:${gig.replyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  };
}