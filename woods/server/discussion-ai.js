// Server-only provider adapters. Never import this module from src/.
export const AI_MODELS = {
  llama: { name: 'Llama', color: '#06D6A0' },
  gemini: { name: 'Gemini', color: '#C77DFF' },
};

export async function callDiscussionAI(model, messages, { temperature = 0.7, maxTokens = 500 } = {}) {
  const signal = AbortSignal.timeout(20000);
  let response;
  if (model === 'llama') {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('Llama is not configured.');
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Skewed Lenses',
      },
      body: JSON.stringify({
        model: process.env.LLAMA_MODEL || 'meta-llama/llama-3.3-70b-instruct',
        messages, temperature, max_tokens: maxTokens,
      }),
    });
  } else if (model === 'gemini') {
    if (!process.env.GOOGLE_AI_KEY) throw new Error('Gemini is not configured.');
    const modelId = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_AI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n') }] },
        contents: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
        })),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
  } else {
    throw new Error('Unknown discussion model.');
  }

  if (!response.ok) {
    // Do not expose provider payloads or credentials in browser errors/logs.
    console.error('Discussion provider failed', { model, status: response.status });
    throw new Error(`${AI_MODELS[model].name} is temporarily unavailable. Please try again.`);
  }
  const data = await response.json();
  const text = model === 'llama'
    ? data.choices?.[0]?.message?.content
    : data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('');
  if (typeof text !== 'string' || !text.trim()) throw new Error(`${AI_MODELS[model].name} returned no response. Please try again.`);
  return text.trim();
}

export function prepareRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return false; }
  return true;
}

export function providerFailure(res, error) {
  const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
  return res.status(timedOut ? 504 : 502).json({
    success: false,
    error: timedOut ? 'The AI took too long to respond. Please try again.' : 'The AI service could not respond. Please try again.',
  });
}
