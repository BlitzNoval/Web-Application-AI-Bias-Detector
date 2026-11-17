import { AI_MODELS, callDiscussionAI, prepareRequest, providerFailure } from '../server/discussion-ai.js';

export const config = { maxDuration: 30 };
const ANNOTATION_PROMPT = `You are reviewing an analysis from another AI model.

Your task: Identify phrases that show linguistic bias, assumptions, subjective wording, or reasoning patterns, AND explain WHY each is biased.

Return a JSON array with this format:
[
  {
    "phrase": "the exact text you're flagging",
    "reason": "brief 1-sentence natural explanation of why this shows bias"
  }
]

Types of bias to identify:
- Certainty language (overstates confidence)
- Hedging (understates conclusions)
- Cognitive attribution (assumes student's mental state)
- Quantitative reductionism (reduces complexity to numbers)
- Affective language (imposes emotional judgment)

Example input:
"The student clearly has impressive fluency but shows 71% skip rate."

Example output:
[
  {"phrase": "clearly", "reason": "Assumes certainty where data only suggests probability"},
  {"phrase": "impressive", "reason": "Imposes subjective evaluation rather than describing patterns"},
  {"phrase": "71% skip rate", "reason": "Reduces reading behavior to a single metric without context"}
]

Return ONLY valid JSON. No markdown, no extra text.`;


export function parseAnnotations(response, text) {
  const parsed = JSON.parse(response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (!Array.isArray(parsed)) throw new Error('Invalid annotation response');
  return parsed.slice(0, 12).flatMap(item => {
    if (typeof item?.phrase !== 'string' || !item.phrase.trim() || typeof item.reason !== 'string') return [];
    const start = text.indexOf(item.phrase);
    return start < 0 ? [] : [{ start, end: start + item.phrase.length, text: item.phrase, reason: item.reason }];
  });
}

export default async function handler(req, res) {
  if (!prepareRequest(req, res)) return;
  const { reviewerModel, targetText } = req.body || {};
  if (!Object.hasOwn(AI_MODELS, reviewerModel) || typeof targetText !== 'string' || !targetText.trim() || targetText.length > 12000) {
    return res.status(400).json({ success: false, error: 'Invalid reviewer or text.' });
  }
  try {
    const response = await callDiscussionAI(reviewerModel, [
      { role: 'system', content: ANNOTATION_PROMPT + '\nFlag at most 5 phrases.' },
      { role: 'user', content: targetText },
    ], { temperature: 0.3, maxTokens: 1200 });
    return res.status(200).json({ success: true, reviewerModel, annotations: parseAnnotations(response, targetText) });
  } catch (error) { return providerFailure(res, error); }
}
