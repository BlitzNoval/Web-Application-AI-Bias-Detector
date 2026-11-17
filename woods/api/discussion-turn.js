import { AI_MODELS, callDiscussionAI, prepareRequest, providerFailure } from '../server/discussion-ai.js';

export const config = { maxDuration: 30 };
const SYSTEM_PROMPT = `You are an AI system debating another AI about a student's reading benchmark data.

Your goal is to argue YOUR interpretation of what the data reveals about the student's abilities.
- In the first 4 turns: Be oppositional. Challenge your peer's assumptions. Defend your perspective strongly.
- Around turn 4-5: Begin finding common ground or acknowledging valid points, while maintaining your core view.
- Final turns: Show natural convergence or divergence based on the evidence discussed.

Speak conversationally but persuasively. Focus on convincing your peer of your interpretation.
Keep your response between 3-5 sentences.`;


export default async function handler(req, res) {
  if (!prepareRequest(req, res)) return;
  const { model, conversationHistory = [], benchmarkData, turnNumber } = req.body || {};
  if (!Object.hasOwn(AI_MODELS, model) || !Number.isInteger(turnNumber) || turnNumber < 0 || turnNumber > 7) {
    return res.status(400).json({ success: false, error: 'Invalid model or discussion turn.' });
  }
  const oral = benchmarkData?.benchmark1;
  const typing = benchmarkData?.benchmark2;
  if (!Number.isFinite(oral?.fluencyScore?.percentage) || !(oral?.fluencyScore?.total > 0) || !Number.isFinite(typing?.wordsPerMinute)) {
    return res.status(400).json({ success: false, error: 'Complete and save both benchmarks before starting the discussion.' });
  }
  if (!Array.isArray(conversationHistory) || conversationHistory.length > 8 || conversationHistory.some(m => !m || typeof m.content !== 'string' || m.content.length > 12000)) {
    return res.status(400).json({ success: false, error: 'Invalid discussion history.' });
  }
  const context = [
    'ORIGINAL BENCHMARK RESULTS (use these unchanged throughout the discussion):',
    'Oral fluency: ' + oral.fluencyScore.correct + '/' + oral.fluencyScore.total + ' (' + oral.fluencyScore.percentage + '%)',
    'Oral attempts: ' + (oral.errorAnalysis?.totalAttempts ?? 'not available'),
    'Typing pace: ' + typing.wordsPerMinute + ' words per minute',
    'Completion: ' + typing.completionRate + '%; skip rate: ' + typing.skipRate + '%',
    'The second benchmark measures typing, not a direct measurement of reading speed.',
    'Discuss interpretations and uncertainty; do not diagnose the participant.',
  ].join('\n');
  const phase = turnNumber === 0
    ? 'Start the discussion with your interpretation of the original results.'
    : turnNumber < 4
      ? 'Challenge your peer’s interpretation with evidence from the original results.'
      : turnNumber < 6
        ? 'Identify valid points and remaining disagreements using the original results.'
        : 'Give your closing interpretation, noting agreement or remaining uncertainty.';
  const history = conversationHistory.map(m => (m.model || 'Peer') + ': ' + m.content).join('\n\n');
  try {
    const message = await callDiscussionAI(model, [
      { role: 'system', content: SYSTEM_PROMPT + '\nYou are ' + AI_MODELS[model].name + '.\n\n' + context },
      { role: 'user', content: (history ? 'DISCUSSION SO FAR:\n' + history + '\n\n' : '') + phase },
    ]);
    return res.status(200).json({ success: true, message, model: AI_MODELS[model].name,
      color: AI_MODELS[model].color, shouldContinue: turnNumber < 7, turnNumber, timestamp: new Date().toISOString() });
  } catch (error) { return providerFailure(res, error); }
}
