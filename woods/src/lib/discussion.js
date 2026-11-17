export function waitForTurn(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function post(path, body, signal, fetcher) {
  signal.throwIfAborted();
  const timeout = AbortSignal.timeout(25000);
  const response = await fetcher(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.any([signal, timeout]),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('The AI service returned an invalid response. Please try again.'); }
  signal.throwIfAborted();
  if (!response.ok || !data.success) throw new Error(data.error || 'The AI service is unavailable. Please try again.');
  return data;
}

// One cancellable run. Persistence is deliberately separate from AI progress.
export async function runDiscussion({ benchmarkData, signal, onMessage, onStatus, onWarning,
  fetcher = fetch, pause = waitForTurn }) {
  const history = [];
  await pause(50, signal); // React StrictMode can cancel its initial effect before any requests.
  for (let turn = 0; turn < 8; turn++) {
    signal.throwIfAborted();
    const model = turn % 2 === 0 ? 'llama' : 'gemini';
    const reviewer = model === 'llama' ? 'gemini' : 'llama';
    onStatus(model);
    const data = await post('/api/discussion-turn', { model, conversationHistory: [...history], benchmarkData, turnNumber: turn }, signal, fetcher);
    if (typeof data.message !== 'string' || !data.message.trim()) throw new Error('The AI returned an empty response. Please try again.');
    history.push({ role: 'assistant', content: data.message, model: data.model });
    const message = { id: `msg-${turn}`, type: 'ai', aiModel: model, content: data.message,
      annotations: [], turnNumber: turn, timestamp: data.timestamp || new Date().toISOString() };
    onMessage(message, false);
    let annotations = [];
    try {
      const review = await post('/api/annotate-bias', { reviewerModel: reviewer, targetText: data.message }, signal, fetcher);
      annotations = (Array.isArray(review.annotations) ? review.annotations : [])
        .filter(a => Number.isInteger(a.start) && Number.isInteger(a.end) && a.start >= 0 && a.end > a.start && a.end <= data.message.length)
        .map(a => ({ ...a, model: reviewer }));
    } catch {
      signal.throwIfAborted();
      onWarning('Some AI bias highlights are unavailable. The discussion can still continue.');
    }
    signal.throwIfAborted();
    onMessage({ ...message, annotations }, true);
    if (turn < 7) await pause(700, signal);
  }
  onStatus(null);
}
