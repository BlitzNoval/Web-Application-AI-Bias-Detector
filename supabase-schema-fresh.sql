-- Skewed Lenses Database Schema - FRESH INSTALLATION
-- This script DROPS all existing tables and recreates them from scratch

-- ============================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- ============================================
DROP TABLE IF EXISTS annotations CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS benchmarks CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- 1. SESSIONS TABLE (Anonymous user sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- 2. BENCHMARKS TABLE (Reading test results)
CREATE TABLE benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('oral_fluency', 'typing_pace')),

  -- Oral Fluency Data
  fluency_score NUMERIC,
  total_words INTEGER,
  correct_words INTEGER,
  total_attempts INTEGER,
  word_data JSONB,

  -- Typing Pace Data
  words_per_minute NUMERIC,
  completion_rate NUMERIC,
  skip_rate NUMERIC,
  total_typed_words INTEGER,
  time_elapsed INTEGER,
  typing_data JSONB,

  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_benchmarks_session_id ON benchmarks(session_id);
CREATE INDEX idx_benchmarks_type ON benchmarks(benchmark_type);
CREATE INDEX idx_benchmarks_created_at ON benchmarks(created_at DESC);

-- 3. CONVERSATIONS TABLE (AI debate messages)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  model TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  lens_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX idx_conversations_model ON conversations(model);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- 4. ANNOTATIONS TABLE (Bias flags from AI)
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  annotation_id TEXT UNIQUE NOT NULL,
  flagged_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  bias_type TEXT,
  flagged_by_model TEXT NOT NULL,
  original_model TEXT NOT NULL,
  turn_number INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_annotations_session_id ON annotations(session_id);
CREATE INDEX idx_annotations_conversation_id ON annotations(conversation_id);
CREATE INDEX idx_annotations_annotation_id ON annotations(annotation_id);
CREATE INDEX idx_annotations_bias_type ON annotations(bias_type);
CREATE INDEX idx_annotations_created_at ON annotations(created_at DESC);

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- Allow anonymous INSERT
CREATE POLICY "Allow anonymous insert on sessions" ON sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on benchmarks" ON benchmarks
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on conversations" ON conversations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on annotations" ON annotations
  FOR INSERT TO anon WITH CHECK (true);


-- Allow anonymous SELECT (read all data)
CREATE POLICY "Allow anonymous read on sessions" ON sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on benchmarks" ON benchmarks
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on conversations" ON conversations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on annotations" ON annotations
  FOR SELECT TO anon USING (true);



-- ============================================
-- STEP 6: UTILITY FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_session_data(p_session_id UUID)
RETURNS TABLE (
  session_info JSONB,
  benchmarks_data JSONB,
  conversations_data JSONB,
  annotations_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT jsonb_agg(to_jsonb(s)) FROM sessions s WHERE s.session_id = p_session_id) as session_info,
    (SELECT jsonb_agg(to_jsonb(b)) FROM benchmarks b WHERE b.session_id = p_session_id) as benchmarks_data,
    (SELECT jsonb_agg(to_jsonb(c)) FROM conversations c WHERE c.session_id = p_session_id) as conversations_data,
    (SELECT jsonb_agg(to_jsonb(a)) FROM annotations a WHERE a.session_id = p_session_id) as annotations_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUCCESS!
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Skewed Lenses database schema created successfully!';
  RAISE NOTICE '✓ Tables: sessions, benchmarks, conversations, annotations';
  RAISE NOTICE '✓ RLS policies enabled for anonymous access';
  RAISE NOTICE '✓ Ready to collect data!';
END $$;
