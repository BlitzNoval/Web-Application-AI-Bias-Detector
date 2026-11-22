import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBenchmarkRecord } from '../src/lib/benchmark-record.js';

test('oral storage reads the actual nested score and converts milliseconds to seconds', () => {
  const row=buildBenchmarkRecord('oral_fluency', {fluencyScore:{correct:27,total:30,percentage:90},errorAnalysis:{totalAttempts:32},wpmMetrics:{totalTestDuration:45000},wordStatuses:[1,0]});
  assert.equal(row.fluency_score,90);assert.equal(row.total_words,30);assert.equal(row.correct_words,27);
  assert.equal(row.total_attempts,32);assert.equal(row.metadata.test_duration_seconds,45);assert.deepEqual(row.word_data,[1,0]);
});
test('typing storage preserves speed, seconds and zero scores', () => {
  const row=buildBenchmarkRecord('typing_pace',{wordsPerMinute:0,totalWords:0,correctWords:0,skippedWords:0,timeElapsed:120,completionRate:0,skipRate:0});
  assert.equal(row.words_per_minute,0);assert.equal(row.metadata.wpm,0);assert.equal(row.time_elapsed,120);assert.equal(row.metadata.test_duration_seconds,120);
});
test('incomplete or unknown benchmark records cannot silently create empty rows',()=>{
  assert.throws(()=>buildBenchmarkRecord('oral_fluency',{}),/incomplete/);
  assert.throws(()=>buildBenchmarkRecord('typing_pace',{wpm:43}),/incomplete/);
  assert.throws(()=>buildBenchmarkRecord('unknown',{}),/Unknown/);
});
