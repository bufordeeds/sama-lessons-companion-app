import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from './schema';
import { seedCurriculumData } from './seed';
import type { CurriculumItemRow, AttemptRow, SessionSegmentRow, MasteryStatus } from '@/types';
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

  // Add video_url column if missing (migration for existing installs)
  try {
    db.runSync('ALTER TABLE practice_sessions ADD COLUMN video_url TEXT');
  } catch {
    // Column already exists — expected on fresh installs
  }

  // Seed handwritten practice data (runs once, guarded by preference flag)
  const { seedPracticeData } = require('./seedPracticeData');
  seedPracticeData();

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
       (SELECT ROUND(SUM(
         (julianday(COALESCE(ss2.ended_at, datetime('now'))) - julianday(ss2.started_at)) * 1440
       )) FROM session_segments ss2 WHERE ss2.session_id = ps.id) as duration_minutes,
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
     GROUP BY ps.id
     HAVING COUNT(a.id) > 0 OR ps.notes IS NOT NULL OR ps.video_url IS NOT NULL
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

export function getSessionNotes(id: string): string | null {
  const row = getDb().getFirstSync<{ notes: string | null }>(
    'SELECT notes FROM practice_sessions WHERE id = ?',
    id,
  );
  return row?.notes ?? null;
}

export function updateSessionNotes(id: string, notes: string): void {
  getDb().runSync(
    'UPDATE practice_sessions SET notes = ? WHERE id = ?',
    notes || null,
    id,
  );
}

export function getSessionVideoUrl(id: string): string | null {
  const row = getDb().getFirstSync<{ video_url: string | null }>(
    'SELECT video_url FROM practice_sessions WHERE id = ?',
    id,
  );
  return row?.video_url ?? null;
}

export function updateSessionVideoUrl(id: string, videoUrl: string): void {
  getDb().runSync(
    'UPDATE practice_sessions SET video_url = ? WHERE id = ?',
    videoUrl || null,
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

export function deleteSegment(id: string): void {
  const db = getDb();
  db.runSync('DELETE FROM attempts WHERE session_segment_id = ?', id);
  db.runSync('DELETE FROM session_segments WHERE id = ?', id);
}

// ── Progress Dashboard ──────────────────────────────────────────────

export function getOverallStats(): {
  totalSessions: number;
  totalAttempts: number;
  totalPracticeMinutes: number;
  avgMistakes: number;
} {
  const row = getDb().getFirstSync<{
    total_sessions: number;
    total_attempts: number;
    total_minutes: number;
    avg_mistakes: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM practice_sessions ps2
        WHERE EXISTS (SELECT 1 FROM session_segments ss2
          JOIN attempts a2 ON a2.session_segment_id = ss2.id
          WHERE ss2.session_id = ps2.id)) as total_sessions,
       COUNT(a.id) as total_attempts,
       (SELECT ROUND(SUM(
         (julianday(COALESCE(ss3.ended_at, datetime('now'))) - julianday(ss3.started_at)) * 1440
       )) FROM session_segments ss3
        WHERE EXISTS (SELECT 1 FROM attempts a3
          WHERE a3.session_segment_id = ss3.id)) as total_minutes,
       ROUND(AVG(a.mistakes), 1) as avg_mistakes
     FROM attempts a`,
  );

  return {
    totalSessions: row?.total_sessions ?? 0,
    totalAttempts: row?.total_attempts ?? 0,
    totalPracticeMinutes: row?.total_minutes ?? 0,
    avgMistakes: row?.avg_mistakes ?? 0,
  };
}

export function getCurriculumProgress(): {
  id: string;
  name: string;
  attemptCount: number;
  ostinatosPassed: number;
  lastPracticed: string | null;
}[] {
  return getDb().getAllSync(
    `SELECT
       ci.id,
       ci.name,
       COUNT(a.id) as attemptCount,
       COUNT(DISTINCT CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN a.ostinato END) as ostinatosPassed,
       MAX(a.created_at) as lastPracticed
     FROM curriculum_items ci
     LEFT JOIN attempts a ON a.curriculum_item_id = ci.id
     GROUP BY ci.id
     ORDER BY ci.sort_order`,
  );
}

export function getMasteryGrid(
  curriculumItemId: string,
): Map<Ostinato, { status: MasteryStatus; attemptCount: number }> {
  const rows = getDb().getAllSync<{
    ostinato: Ostinato;
    attempt_count: number;
    has_passing: number;
    recent_avg: number;
    recent_count: number;
    recent_breaks: number;
  }>(
    `SELECT
       ostinato,
       COUNT(*) as attempt_count,
       MAX(CASE WHEN mistakes <= 3 AND ostinato_broke = 0 THEN 1 ELSE 0 END) as has_passing,
       (SELECT AVG(sub.mistakes) FROM (
         SELECT mistakes FROM attempts a2
         WHERE a2.curriculum_item_id = a.curriculum_item_id
           AND a2.ostinato = a.ostinato
         ORDER BY a2.created_at DESC LIMIT 10
       ) sub) as recent_avg,
       (SELECT COUNT(*) FROM (
         SELECT id FROM attempts a3
         WHERE a3.curriculum_item_id = a.curriculum_item_id
           AND a3.ostinato = a.ostinato
         ORDER BY a3.created_at DESC LIMIT 10
       )) as recent_count,
       (SELECT SUM(sub2.ostinato_broke) FROM (
         SELECT ostinato_broke FROM attempts a4
         WHERE a4.curriculum_item_id = a.curriculum_item_id
           AND a4.ostinato = a.ostinato
         ORDER BY a4.created_at DESC LIMIT 10
       ) sub2) as recent_breaks
     FROM attempts a
     WHERE a.curriculum_item_id = ?
     GROUP BY a.ostinato`,
    curriculumItemId,
  );

  const map = new Map<Ostinato, { status: MasteryStatus; attemptCount: number }>();
  for (const row of rows) {
    let status: MasteryStatus = 'in_progress';
    if (row.has_passing === 1) {
      status = 'passed';
      if (row.recent_count >= 10 && row.recent_avg <= 1 && row.recent_breaks === 0) {
        status = 'mastered';
      }
    }
    map.set(row.ostinato, { status, attemptCount: row.attempt_count });
  }
  return map;
}

export function getTempoHistory(curriculumItemId: string): {
  ostinato: Ostinato;
  tempo: number;
  date: string;
  passed: boolean;
}[] {
  return getDb()
    .getAllSync<{
      ostinato: Ostinato;
      tempo: number;
      date: string;
      passed: number;
    }>(
      `SELECT
         a.ostinato,
         a.tempo,
         date(a.created_at) as date,
         CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN 1 ELSE 0 END as passed
       FROM attempts a
       WHERE a.curriculum_item_id = ?
       ORDER BY a.created_at`,
      curriculumItemId,
    )
    .map((r) => ({ ...r, passed: r.passed === 1 }));
}

export function getAggregateTempoHistory(curriculumItemId: string): {
  date: string;
  avgTempo: number;
  minTempo: number;
  maxTempo: number;
}[] {
  return getDb().getAllSync(
    `SELECT
       date(a.created_at) as date,
       ROUND(AVG(a.tempo), 0) as avgTempo,
       MIN(a.tempo) as minTempo,
       MAX(a.tempo) as maxTempo
     FROM attempts a
     WHERE a.curriculum_item_id = ?
     GROUP BY date(a.created_at)
     ORDER BY date`,
    curriculumItemId,
  );
}

export function getPracticeDays(): string[] {
  return getDb()
    .getAllSync<{ day: string }>(
      `SELECT DISTINCT date(started_at) as day
       FROM practice_sessions
       ORDER BY day`,
    )
    .map((r) => r.day);
}

export function getStreakStats(): {
  current: number;
  longest: number;
  totalDays: number;
} {
  const days = getPracticeDays();
  if (days.length === 0) return { current: 0, longest: 0, totalDays: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const daySet = new Set(days);

  // Current streak: count backwards from today (or yesterday)
  let current = 0;
  let checkDate = new Date(today);
  // If today isn't a practice day, start from yesterday
  if (!daySet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (daySet.has(checkDate.toISOString().slice(0, 10))) {
    current++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Longest streak
  let longest = 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  return { current, longest, totalDays: days.length };
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
