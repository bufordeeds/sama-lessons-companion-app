import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from './schema';
import { seedCurriculumData } from './seed';
import type { CurriculumItemRow, AttemptRow, SessionSegmentRow } from '@/types';
import type { Ostinato } from '@/constants/curriculum';

let _db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!_db) {
    _db = openDatabaseSync('sama-practice.db');
  }
  return _db;
}

export async function ensureDbReady(): Promise<SQLiteDatabase> {
  const db = getDb();
  initializeDatabase(db);
  seedCurriculumData(db);
  return db;
}

// ── Curriculum ──────────────────────────────────────────────────────

export function getCurriculumItems(): CurriculumItemRow[] {
  return getDb().getAllSync<CurriculumItemRow>(
    'SELECT * FROM curriculum_items ORDER BY sort_order'
  );
}

// ── Sessions ────────────────────────────────────────────────────────

export function createSession(id: string, startedAt: string): void {
  getDb().runSync(
    'INSERT INTO practice_sessions (id, started_at) VALUES (?, ?)',
    id,
    startedAt,
  );
}

export function endSession(id: string, endedAt: string): void {
  getDb().runSync(
    'UPDATE practice_sessions SET ended_at = ? WHERE id = ?',
    endedAt,
    id,
  );
}

// ── Segments ────────────────────────────────────────────────────────

export function createSegment(
  id: string,
  sessionId: string,
  segmentNumber: number,
  startedAt: string,
): void {
  getDb().runSync(
    'INSERT INTO session_segments (id, session_id, segment_number, started_at) VALUES (?, ?, ?, ?)',
    id,
    sessionId,
    segmentNumber,
    startedAt,
  );
}

export function endSegment(id: string, endedAt: string): void {
  getDb().runSync(
    'UPDATE session_segments SET ended_at = ? WHERE id = ?',
    endedAt,
    id,
  );
}

// ── Attempts ────────────────────────────────────────────────────────

export function createAttempt(
  id: string,
  segmentId: string,
  curriculumItemId: string,
  ostinato: Ostinato,
  tempo: number,
  mistakes: number,
  ostinatoBroke: boolean,
): void {
  getDb().runSync(
    `INSERT INTO attempts (id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    segmentId,
    curriculumItemId,
    ostinato,
    tempo,
    mistakes,
    ostinatoBroke ? 1 : 0,
  );
}

export function deleteAttempt(id: string): void {
  getDb().runSync('DELETE FROM attempts WHERE id = ?', id);
}

export function getAttemptsBySegment(segmentId: string): AttemptRow[] {
  return getDb().getAllSync<AttemptRow>(
    'SELECT * FROM attempts WHERE session_segment_id = ? ORDER BY created_at ASC',
    segmentId,
  );
}

export function getAttemptsBySegmentAndOstinato(
  segmentId: string,
  ostinato: Ostinato,
): AttemptRow[] {
  return getDb().getAllSync<AttemptRow>(
    'SELECT * FROM attempts WHERE session_segment_id = ? AND ostinato = ? ORDER BY created_at ASC',
    segmentId,
    ostinato,
  );
}

export function getOstinatoStatusesForSegment(
  segmentId: string,
): Map<Ostinato, { passed: boolean; attemptCount: number }> {
  const rows = getDb().getAllSync<{
    ostinato: Ostinato;
    attempt_count: number;
    has_passing: number;
  }>(
    `SELECT
       ostinato,
       COUNT(*) as attempt_count,
       MAX(CASE WHEN mistakes <= 3 AND ostinato_broke = 0 THEN 1 ELSE 0 END) as has_passing
     FROM attempts
     WHERE session_segment_id = ?
     GROUP BY ostinato`,
    segmentId,
  );

  const map = new Map<Ostinato, { passed: boolean; attemptCount: number }>();
  for (const row of rows) {
    map.set(row.ostinato, {
      passed: row.has_passing === 1,
      attemptCount: row.attempt_count,
    });
  }
  return map;
}

export function getSegmentSummary(segmentId: string): {
  attemptCount: number;
  ostinatosPassed: number;
  avgMistakes: number;
} {
  const row = getDb().getFirstSync<{
    attempt_count: number;
    ostinatos_passed: number;
    avg_mistakes: number;
  }>(
    `SELECT
       COUNT(*) as attempt_count,
       COUNT(DISTINCT CASE WHEN mistakes <= 3 AND ostinato_broke = 0 THEN ostinato END) as ostinatos_passed,
       ROUND(AVG(mistakes), 1) as avg_mistakes
     FROM attempts
     WHERE session_segment_id = ?`,
    segmentId,
  );

  return {
    attemptCount: row?.attempt_count ?? 0,
    ostinatosPassed: row?.ostinatos_passed ?? 0,
    avgMistakes: row?.avg_mistakes ?? 0,
  };
}

// ── History ─────────────────────────────────────────────────────────

export function getAllSessions(): {
  id: string;
  started_at: string;
  ended_at: string | null;
  curriculum_item_id: string;
  curriculum_item_name: string;
  segment_count: number;
  duration_minutes: number;
  total_attempts: number;
  avg_mistakes: number;
  min_tempo: number;
  max_tempo: number;
  ostinatos_passed: number;
  total_breaks: number;
}[] {
  return getDb().getAllSync(
    `SELECT
       ps.id,
       ps.started_at,
       ps.ended_at,
       a.curriculum_item_id,
       ci.name as curriculum_item_name,
       COUNT(DISTINCT ss.id) as segment_count,
       ROUND((julianday(COALESCE(ps.ended_at, datetime('now'))) - julianday(ps.started_at)) * 1440) as duration_minutes,
       COUNT(a.id) as total_attempts,
       ROUND(AVG(a.mistakes), 1) as avg_mistakes,
       MIN(a.tempo) as min_tempo,
       MAX(a.tempo) as max_tempo,
       COUNT(DISTINCT CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN a.ostinato END) as ostinatos_passed,
       SUM(CASE WHEN a.ostinato_broke = 1 THEN 1 ELSE 0 END) as total_breaks
     FROM practice_sessions ps
     LEFT JOIN session_segments ss ON ss.session_id = ps.id
     LEFT JOIN attempts a ON a.session_segment_id = ss.id
     LEFT JOIN curriculum_items ci ON ci.id = a.curriculum_item_id
     WHERE ps.ended_at IS NOT NULL
     GROUP BY ps.id
     ORDER BY ps.started_at DESC`,
  );
}

export function getSessionSegments(sessionId: string): SessionSegmentRow[] {
  return getDb().getAllSync<SessionSegmentRow>(
    'SELECT * FROM session_segments WHERE session_id = ? ORDER BY segment_number',
    sessionId,
  );
}

export function getSessionAttemptsGrouped(sessionId: string): AttemptRow[] {
  return getDb().getAllSync<AttemptRow>(
    `SELECT a.*
     FROM attempts a
     JOIN session_segments ss ON a.session_segment_id = ss.id
     WHERE ss.session_id = ?
     ORDER BY ss.segment_number, a.ostinato, a.created_at`,
    sessionId,
  );
}

export function getSessionCurriculumItemId(sessionId: string): string | null {
  const row = getDb().getFirstSync<{ curriculum_item_id: string }>(
    `SELECT DISTINCT a.curriculum_item_id
     FROM attempts a
     JOIN session_segments ss ON a.session_segment_id = ss.id
     WHERE ss.session_id = ?
     LIMIT 1`,
    sessionId,
  );
  return row?.curriculum_item_id ?? null;
}

// ── Session Management ──────────────────────────────────────────────

export function getSessionById(id: string): { id: string; started_at: string; ended_at: string | null } | null {
  return getDb().getFirstSync<{ id: string; started_at: string; ended_at: string | null }>(
    'SELECT id, started_at, ended_at FROM practice_sessions WHERE id = ?',
    id,
  );
}

export function reopenSession(id: string): void {
  getDb().runSync('UPDATE practice_sessions SET ended_at = NULL WHERE id = ?', id);
}

export function deleteSession(id: string): void {
  const db = getDb();
  db.runSync(
    `DELETE FROM attempts WHERE session_segment_id IN (
       SELECT id FROM session_segments WHERE session_id = ?
     )`,
    id,
  );
  db.runSync('DELETE FROM session_segments WHERE session_id = ?', id);
  db.runSync('DELETE FROM practice_sessions WHERE id = ?', id);
}

export function getLastSegmentForSession(sessionId: string): SessionSegmentRow | null {
  return getDb().getFirstSync<SessionSegmentRow>(
    'SELECT * FROM session_segments WHERE session_id = ? ORDER BY segment_number DESC LIMIT 1',
    sessionId,
  );
}

// ── Preferences ─────────────────────────────────────────────────────

export function getPreference(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>(
    'SELECT value FROM user_preferences WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export function setPreference(key: string, value: string): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)',
    key,
    value,
  );
}
