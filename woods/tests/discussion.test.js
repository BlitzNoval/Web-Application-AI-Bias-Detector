import test from 'node:test';
import assert from 'node:assert/strict';
import discussionHandler from '../api/discussion-turn.js';
import annotationHandler, { parseAnnotations } from '../api/annotate-bias.js';
import { runDiscussion, waitForTurn } from '../src/lib/discussion.js';

const benchmarkData = { benchmark1: { fluencyScore: { correct: 27, total: 30, percentage: 90 }, errorAnalysis: { totalAttempts: 32 } },
  benchmark2: { wordsPerMinute: 43, completionRate: 50, skipRate: 10 } };
const result = data => ({ ok: true, json: async () => data });
function response() { return { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, json(data) { this.body=data; return this; }, end() {} }; }

test('all eight turns alternate and retain the original data and full history', async () => {
  const requests=[], reviewed=[];
  await runDiscussion({ benchmarkData, signal: new AbortController().signal,
    pause: async () => {}, onStatus() {}, onWarning() { assert.fail('unexpected warning'); },
    onMessage(m, done) { if(done) reviewed.push(m); },
    fetcher: async (url, options) => {
      const body=JSON.parse(options.body);
      if(url.endsWith('discussion-turn')) { requests.push(body); return result({ success:true,message:'A clear interpretation.',model:body.model }); }
      return result({ success:true,annotations:[{start:2,end:7,text:'clear',reason:'certainty'}] });
    },
  });
  assert.equal(requests.length,8);assert.equal(reviewed.length,8);
  requests.forEach((r,i)=>{assert.equal(r.model,i%2?'gemini':'llama');assert.equal(r.conversationHistory.length,i);assert.deepEqual(r.benchmarkData,benchmarkData);});
  assert.equal(reviewed[0].annotations[0].model,'gemini');assert.equal(reviewed[1].annotations[0].model,'llama');
});

test('annotation outage does not terminate the discussion', async () => {
  let messages=0,warnings=0;
  await runDiscussion({ benchmarkData,signal:new AbortController().signal,pause:async()=>{},onStatus(){},onWarning(){warnings++;},onMessage(_,done){if(done)messages++;},
    fetcher:async url=>url.endsWith('discussion-turn')?result({success:true,message:'Reply',model:'Llama'}):{ok:false,json:async()=>({success:false,error:'Review unavailable'})} });
  assert.equal(messages,8);assert.equal(warnings,8);
});

test('provider failure becomes a visible retryable error, not successful completion', async () => {
  await assert.rejects(runDiscussion({benchmarkData,signal:new AbortController().signal,pause:async()=>{},onStatus(){},onWarning(){},onMessage(){assert.fail('no message expected');},
    fetcher:async()=>({ok:false,json:async()=>({success:false,error:'Try again'})})}),/Try again/);
});

test('leaving aborts the current run and stops subsequent requests and messages', async () => {
  const controller=new AbortController();let requests=0,delivered=0;
  await assert.rejects(runDiscussion({benchmarkData,signal:controller.signal,pause:async()=>{},onStatus(){},onWarning(){},onMessage(){delivered++;},
    fetcher:async()=>{requests++;controller.abort();return result({success:true,message:'Late reply'});} }),{name:'AbortError'});
  assert.equal(requests,1);assert.equal(delivered,0);
});

test('StrictMode cleanup cancels startup before a provider request', async () => {
  const controller=new AbortController();let calls=0;
  const running=runDiscussion({benchmarkData,signal:controller.signal,onMessage(){},onStatus(){},onWarning(){},fetcher:async()=>{calls++;}});
  controller.abort();await assert.rejects(running,{name:'AbortError'});assert.equal(calls,0);
  const stopped=new AbortController();stopped.abort();await assert.rejects(waitForTurn(1,stopped.signal),{name:'AbortError'});
});

test('discussion route validates data and supplies original metrics on later turns',async()=>{
  const originalFetch=globalThis.fetch,originalKey=process.env.OPENROUTER_API_KEY;let payload;
  process.env.OPENROUTER_API_KEY='test-only';
  globalThis.fetch=async(_,options)=>{payload=JSON.parse(options.body);return result({choices:[{message:{content:'Interpretation'}}]});};
  try {
    const res=response();await discussionHandler({method:'POST',body:{model:'llama',turnNumber:2,benchmarkData,conversationHistory:[{model:'Gemini',content:'Earlier reply'}]}},res);
    assert.equal(res.code,200);assert.match(payload.messages[0].content,/43 words per minute/);assert.match(payload.messages[1].content,/Gemini: Earlier reply/);
    for(const body of [{model:'llama',turnNumber:0,benchmarkData:{}},{model:'constructor',turnNumber:0,benchmarkData},{model:'llama',turnNumber:8,benchmarkData}]) {
      const invalid=response();await discussionHandler({method:'POST',body},invalid);assert.equal(invalid.code,400);
    }
  } finally {globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=originalKey;}
});

test('provider errors return 502 without leaking raw provider payloads',async()=>{
  const originalFetch=globalThis.fetch,originalKey=process.env.GOOGLE_AI_KEY;
  process.env.GOOGLE_AI_KEY='test-only';globalThis.fetch=async()=>({ok:false,status:404,json:async()=>({error:{message:'sensitive-provider-error'}})});
  try {const res=response();await discussionHandler({method:'POST',body:{model:'gemini',turnNumber:1,benchmarkData}},res);assert.equal(res.code,502);assert.equal(res.body.success,false);assert.doesNotMatch(JSON.stringify(res.body),/sensitive-provider-error|test-only/);}
  finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GOOGLE_AI_KEY;else process.env.GOOGLE_AI_KEY=originalKey;}
});

test('annotations handle fenced JSON and reject malformed or out-of-text phrases',async()=>{
  assert.deepEqual(parseAnnotations('```json\n[{"phrase":"clear","reason":"certainty"},{"phrase":"missing","reason":"none"}]\n```','A clear claim.'),[{start:2,end:7,text:'clear',reason:'certainty'}]);
  assert.throws(()=>parseAnnotations('invalid','text'));
  const res=response();await annotationHandler({method:'POST',body:{reviewerModel:'invalid',targetText:'Text'}},res);assert.equal(res.code,400);
});
