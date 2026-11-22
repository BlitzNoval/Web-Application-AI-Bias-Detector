export function buildBenchmarkRecord(type, results) {
  if (!results) throw new Error('No benchmark results to save.');
  const metadata = { test_date: results.timestamp || new Date().toISOString(), test_completed: true, exported: false };
  if (type === 'oral_fluency') {
    const score = results.fluencyScore;
    if (!Number.isFinite(score?.percentage) || !(score?.total > 0) || !Number.isFinite(score?.correct)) throw new Error('Reading results are incomplete.');
    return { benchmark_type: type, fluency_score: score.percentage, total_words: score.total,
      correct_words: score.correct, total_attempts: results.errorAnalysis?.totalAttempts ?? null,
      word_data: results.wordStatuses || [],
      metadata: { ...metadata, test_name: 'Oral Reading Fluency Test', export_label: 'BENCHMARK_1_ORAL_FLUENCY',
        accuracy_percentage: score.percentage, test_duration_seconds: results.wpmMetrics?.totalTestDuration == null ? null : results.wpmMetrics.totalTestDuration / 1000 } };
  }
  if (type === 'typing_pace') {
    if (!Number.isFinite(results.wordsPerMinute) || !Number.isFinite(results.timeElapsed)) throw new Error('Typing results are incomplete.');
    return { benchmark_type: type, words_per_minute: results.wordsPerMinute, completion_rate: results.completionRate,
      skip_rate: results.skipRate, total_typed_words: results.totalWords, correct_words: results.correctWords,
      time_elapsed: results.timeElapsed, typing_data: results.wordStatuses || [],
      metadata: { ...metadata, test_name: 'Typing Pace Assessment', export_label: 'BENCHMARK_2_TYPING_PACE',
        test_duration_seconds: results.timeElapsed, wpm: results.wordsPerMinute, skipped_words: results.skippedWords,
        completion_percentage: results.completionRate, skip_percentage: results.skipRate } };
  }
  throw new Error('Unknown benchmark type.');
}
