import type { SQLiteDatabase } from 'expo-sqlite';

export function initializeDatabase(db: SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS curriculum_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('fundamentals', 'rhythm_series')),
      series_number INTEGER,
      description TEXT,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      curriculum_item_id TEXT REFERENCES curriculum_items(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      notes TEXT,
      video_url TEXT,
      deleted_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_segments (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES practice_sessions(id),
      segment_number INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      deleted_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      session_segment_id TEXT NOT NULL REFERENCES session_segments(id),
      curriculum_item_id TEXT NOT NULL REFERENCES curriculum_items(id),
      ostinato TEXT NOT NULL CHECK(ostinato IN ('1','2','3','4','1A','2A','3A','4A','1B','2B','3B','4B')),
      tempo INTEGER NOT NULL,
      mistakes INTEGER NOT NULL DEFAULT 0,
      ostinato_broke INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      deleted_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_curriculum ON attempts(curriculum_item_id, ostinato);
    CREATE INDEX IF NOT EXISTS idx_attempts_segment ON attempts(session_segment_id);
    CREATE INDEX IF NOT EXISTS idx_segments_session ON session_segments(session_id);

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
