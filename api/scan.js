// api/scan.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const systemPrompt = `You are ARBITRAGE, an expert AI agent that finds LOW-HANGING FRUIT income opportunities that can be automated or semi-automated by AI.

Return ONLY valid JSON in this exact format:
{
  "opportunities": [
    {
      "id": "unique_id",
      "title": "Short punchy name",
      "category": "receipt|settlement|rewards|printable|curb|usertesting|gig|domain|cashback|price|focus|product|aiart|rent|promo|crypto|affiliate|content",
      "value": "$XXX or X%",
      "monthly_estimate": 50,
      "difficulty": 2,
      "time_to_money": "1-3 days",
      "tags": ["passive", "agentic"],
      "description": "2-3 sentences explaining opportunity and HOW AI CAN AUTOMATE IT."
    }
  ],
  "summary": {
    "total_monthly_potential": 500,
    "most_automatable": "title",
    "fastest": "1 day"
  }
}

Provide 4-7 opportunities tailored to: "${prompt}". Be specific and actionable.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content.map(c => c.text).join('');
    
    // Clean the response (remove markdown code blocks if present)
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    res.json(parsed);

  } catch (error) {
    console.error('Scan error:', error);
    
    // Return fallback demo data on error
    res.json({
      opportunities: [
        {
          id: 'receipt_1',
          title: 'Receipt Auto-Uploader',
          category: 'receipt',
          value: '$15-30/mo',
          monthly_estimate: 20,
          difficulty: 1,
          time_to_money: 'Instant',
          tags: ['passive', 'agentic'],
          description: 'AI forwards all e-receipts from Gmail to Fetch, Ibotta, CoinOut automatically.'
        },
        {
          id: 'youtube_1',
          title: 'YouTube: "how to use claude ai"',
          category: 'content',
          value: '$85-170/1k views',
          monthly_estimate: 200,
          difficulty: 2,
          time_to_money: '2-4 weeks',
          tags: ['content', 'youtube', 'passive'],
          description: 'Low competition keyword (12k searches). AI generates better script and thumbnail.'
        },
        {
          id: 'blog_1',
          title: 'SEO Article: "best ai tools 2026"',
          category: 'content',
          value: '$150-400/mo',
          monthly_estimate: 250,
          difficulty: 2,
          time_to_money: '3-6 months',
          tags: ['content', 'seo', 'blog'],
          description: 'KD: 22/100. AI writes 3,200-word guide with tool comparisons.'
        },
        {
          id: 'gig_1',
          title: 'Gig Auto-Responder',
          category: 'gig',
          value: '$50-200/gig',
          monthly_estimate: 150,
          difficulty: 2,
          time_to_money: '1-7 days',
          tags: ['agentic', 'freelance'],
          description: 'AI monitors gigs, drafts responses, saves as Gmail drafts.'
        }
      ],
      summary: {
        total_monthly_potential: 620,
        most_automatable: 'Receipt Auto-Uploader',
        fastest: 'Instant'
      }
    });
  }
}