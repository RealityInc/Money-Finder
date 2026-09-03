const DEFAULT_MODEL = 'deepseek-v4-pro';

export function deepSeekConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function createDeepSeekResponse({
  instructions,
  input,
  effort = process.env.DEEPSEEK_DEFAULT_EFFORT || 'high',
  maxOutputTokens = 4000,
}) {
  if (!deepSeekConfigured()) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await fetch('https://api.deepseek.com/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
      instructions,
      input,
      reasoning: { effort },
      max_output_tokens: maxOutputTokens,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = (payload.output || [])
    .filter(item => item.type === 'message')
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text')
    .map(item => item.text)
    .join('');

  if (!text) throw new Error('DeepSeek returned no output text');
  return { text, model: payload.model, usage: payload.usage };
}
