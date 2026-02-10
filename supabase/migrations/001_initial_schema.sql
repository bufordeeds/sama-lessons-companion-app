-- Phase 4: Supabase schema for SAMA Drum Practice
-- Mirrors local SQLite tables with added user_id for RLS

-- Practice sessions
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  curriculum_item_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  notes TEXT,
  video_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session segments
CREATE TABLE session_segments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
  segment_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attempts
CREATE TABLE attempts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_segment_id UUID REFERENCES session_segments(id) ON DELETE CASCADE,
  curriculum_item_id TEXT NOT NULL,
  ostinato TEXT NOT NULL,
  tempo INTEGER NOT NULL,
  mistakes INTEGER NOT NULL DEFAULT 0,
  ostinato_broke BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- Indexes (critical for RLS performance)
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
CREATE INDEX idx_segments_user ON session_segments(user_id);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_sessions_updated ON practice_sessions(updated_at);
CREATE INDEX idx_segments_updated ON session_segments(updated_at);
CREATE INDEX idx_attempts_updated ON attempts(updated_at);

-- Row Level Security
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON practice_sessions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE session_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON session_segments
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON attempts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON user_preferences
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON session_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
