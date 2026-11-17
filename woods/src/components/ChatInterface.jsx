import { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import AnnotatedText from './AnnotatedText';
import { saveConversationMessage, saveAnnotationBatch } from '../lib/supabase';
import { runDiscussion } from '../lib/discussion';

const AI_MODELS = {
  llama: {
    name: 'Llama',
    label: 'LLAMA — 1ST INTERPRETATION',
    color: '#0DD7A3',
    lightColor: '#1FFFC4',
    borderOpacity: '0.3',
    thinkingPhrases: [
      'crunching the numbers...',
      'running stats through the matrix...',
      'debugging my assumptions...',
      'compiling evidence...',
      'while(true) { think(); }',
      'checking for off-by-one errors...',
      'parsing data like it\'s JSON...',
      'calculating confidence intervals...',
      'console.log("thinking...")...',
      'trying to optimize this argument...'
    ]
  },
  gemini: {
    name: 'Gemini',
    label: 'GEMINI — RESPONSE',
    color: '#B48CFF',
    lightColor: '#D4B3FF',
    borderOpacity: '0.3',
    thinkingPhrases: [
      'reading between the lines...',
      'contemplating the human element...',
      'try { understand(); } catch...',
      'considering alternative perspectives...',
      'questioning my own biases...',
      'thinking outside the dataset...',
      'refactoring my interpretation...',
      'awaiting deeper insights...',
      'git commit -m "rethinking this"...',
      'deploying empathy.exe...'
    ]
  }
};


function ChatInterface({ benchmarkData, onClose, sessionId, hasConsented }) {
  const [messages, setMessages] = useState([]);
  const [activeModel, setActiveModel] = useState(null);
  const [showHighlights, setShowHighlights] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [run, setRun] = useState(0);
  const messagesEndRef = useRef(null);
  const trackingRef = useRef({ sessionId, hasConsented });
  const benchmarkJson = JSON.stringify(benchmarkData);
  const hasBenchmarks = !!benchmarkData?.benchmark1 && !!benchmarkData?.benchmark2;

  useEffect(() => { trackingRef.current = { sessionId, hasConsented }; }, [sessionId, hasConsented]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeModel, error]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const conversationId = crypto.randomUUID();
    const data = JSON.parse(benchmarkJson);
    setMessages([]);
    setComplete(false);
    setError('');
    setWarning('');
    setShowHighlights(false);
    setActiveModel(null);
    if (!data?.benchmark1 || !data?.benchmark2) return () => controller.abort();

    async function persistMessage(message) {
      const tracking = trackingRef.current;
      if (signal.aborted || !tracking.hasConsented || !tracking.sessionId) return;
      try {
        const saved = await saveConversationMessage(tracking.sessionId, {
          conversation_id: conversationId, turn_number: message.turnNumber,
          model: message.aiModel, role: 'assistant', content: message.content,
          metadata: { annotations: message.annotations, ai_model_name: AI_MODELS[message.aiModel].name,
            message_timestamp: message.timestamp, message_length: message.content.length,
            annotation_count: message.annotations.length, exported: false },
        });
        if (saved.error) throw saved.error;
        if (signal.aborted || !trackingRef.current.hasConsented) return;
        if (message.annotations.length) {
          const savedAnnotations = await saveAnnotationBatch(tracking.sessionId, conversationId,
            message.annotations.map((ann, index) => ({
              annotation_id: conversationId + '-turn' + message.turnNumber + '-ann' + index,
              flagged_text: ann.text, explanation: ann.reason || 'Bias detected', bias_type: ann.category || 'general',
              flagged_by_model: ann.model, original_model: message.aiModel, turn_number: message.turnNumber,
              metadata: { flagged_by_ai: AI_MODELS[ann.model].name, original_ai: AI_MODELS[message.aiModel].name, exported: false },
            })));
          if (savedAnnotations.error) throw savedAnnotations.error;
        }
      } catch {
        if (!signal.aborted) setWarning('The discussion is available here, but some research data could not be saved online.');
      }
    }

    runDiscussion({
      benchmarkData: data, signal,
      onStatus: setActiveModel,
      onWarning: setWarning,
      onMessage(message, reviewed) {
        if (signal.aborted) return;
        setMessages(previous => reviewed
          ? previous.map(item => item.id === message.id ? message : item)
          : [...previous, message]);
        if (reviewed) void persistMessage(message);
      },
    }).then(() => {
      if (!signal.aborted) { setComplete(true); setShowHighlights(true); }
    }).catch(failure => {
      if (!signal.aborted) {
        setActiveModel(null);
        setShowHighlights(true);
        setError(failure.name === 'TimeoutError' ? 'The AI took too long to respond. Please try again.' : failure.message);
      }
    });
    return () => controller.abort();
  }, [run, benchmarkJson]);

  const stats = messages.reduce((counts, message) => {
    message.annotations.forEach(annotation => { counts[annotation.model] += 1; });
    return counts;
  }, { llama: 0, gemini: 0 });

  return (
    <div className="academic-interface">
      <div className="interface-header">
        <div className="header-top">
          <button className="minimal-back-btn" onClick={onClose}>← BACK</button>
          <div className="header-title">THE AI'S PERSPECTIVE</div>
          <div className="header-controls-right">
            {(complete || error) && hasBenchmarks && <>
              {messages.length > 0 && <button className={'control-btn ' + (showHighlights ? 'active' : '')}
                onClick={() => setShowHighlights(value => !value)}>{showHighlights ? 'HIDE FLAGS' : 'SHOW FLAGS'}</button>}
              <button className="control-btn" onClick={() => setRun(value => value + 1)}>{error ? 'TRY AGAIN' : 'REPROMPT'}</button>
            </>}
          </div>
        </div>
        {(stats.llama > 0 || stats.gemini > 0) && <div className="stats-corner">
          {Object.entries(stats).map(([model, count]) => <div key={model} className={'stat-counter ' + model + '-counter'}>
            <span className="counter-label">{AI_MODELS[model].name.toUpperCase()} FLAGS</span>
            <span className="counter-value">{count}</span>
          </div>)}
        </div>}
      </div>
      <div className="dialogue-stream" aria-busy={!!activeModel}>
        <div className="framing-statement">{hasBenchmarks
          ? 'Four short replies about possible dyslexia, using the same reading and typing results. Explore the reasoning and bias highlights. This discussion cannot provide a diagnosis.'
          : 'Complete and save both benchmarks, then return here to compare the AI perspectives.'}</div>
        {messages.map((message, index) => {
          const ai = AI_MODELS[message.aiModel];
          return <div key={message.id} className="dialogue-card">
            <div className="card-label" style={{ color: ai.lightColor }}>{index === 0 ? ai.label : ai.name.toUpperCase() + ' — RESPONSE'}</div>
            <div className="card-content" style={{ borderColor: ai.color + '4d' }}>
              {showHighlights && message.annotations.length > 0
                ? <AnnotatedText text={message.content} annotations={message.annotations} />
                : <p>{message.content}</p>}
            </div>
          </div>;
        })}
        {activeModel && <div className="dialogue-card" role="status">
          <div className="card-label" style={{ color: AI_MODELS[activeModel].lightColor }}>{AI_MODELS[activeModel].name.toUpperCase()}</div>
          <div className="typing-container">
            <div className="typing-indicator"><span className="dot" /><span className="dot" /><span className="dot" /></div>
            <p className="thinking-phrase">Preparing the next perspective and checking bias highlights…</p>
          </div>
        </div>}
        {error && <div className="discussion-notice" role="alert">{error}</div>}
        {warning && <div className="discussion-notice" role="status">{warning}</div>}
        {complete && <div className="reflection-panel">
          <div className="reflection-label">DISCUSSION COMPLETE</div>
          <div className="reflection-content">What did each AI assume about dyslexia? Compare its claims with the results. The highlights show one AI’s critique of the other, not verified findings or a diagnosis.</div>
        </div>}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatInterface;
