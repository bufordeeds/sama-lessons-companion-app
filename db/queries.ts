import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from './schema';
import { seedCurriculumData } from './seed';
import type { CurriculumItemRow, AttemptRow, SessionSegmentRow, MasteryStatus } from '@/types';
import type { Ostinato } from '@/constants/curriculum';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let _db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!_db) {
    throw new Error('Database not initialized. Call ensureDbReady() first.');
  }
  return _db;
}

export async function ensureDbReady(): Promise<SQLiteDatabase> {
  if (!_db) {
    _db = await openDatabaseAsync('sama-practice.db');
  }
  const db = _db;
  await initializeDatabase(db);
  await seedCurriculumData(db);

  const migrations = [
    'ALTER TABLE practice_sessions ADD COLUMN video_url TEXT',
    'ALTER TABLE practice_sessions ADD COLUMN curriculum_item_id TEXT REFERENCES curriculum_items(id)',
    'ALTER TABLE practice_sessions ADD COLUMN deleted_at TEXT',
    'ALTER TABLE practice_sessions ADD COLUMN synced INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE session_segments ADD COLUMN deleted_at TEXT',
    'ALTER TABLE session_segments ADD COLUMN synced INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE attempts ADD COLUMN deleted_at TEXT',
    'ALTER TABLE attempts ADD COLUMN synced INTEGER NOT NULL DEFAULT 0',
  ];
  for (const sql of migrations) {
    try { await db.runAsync(sql); } catch { /* column already exists */ }
  }

  const { seedPracticeData } = require('./seedPracticeData');
  await seedPracticeData();

  return db;
}

// ── Curriculum ──────────────────────────────────────────────────────

export async function getCurriculumItems(): Promise<CurriculumItemRow[]> {
  return getDb().getAllAsync<CurriculumItemRow>(
    'SELECT * FROM curriculum_items ORDER BY sort_order'
  );
}

// ── Sessions ────────────────────────────────────────────────────────

export async function createSession(id: string, startedAt: string, curriculumItemId?: string): Promise<void> {
  await getDb().runAsync(
    'INSERT INTO practice_sessions (id, started_at, curriculum_item_id, synced) VALUES (?, ?, ?, 0)',
    id, startedAt, curriculumItemId ?? null,
  );
}

export async function endSession(id: string, endedAt: string): Promise<void> {
  await getDb().runAsync(
    'UPDATE practice_sessions SET ended_at = ?, synced = 0 WHERE id = ?',
    endedAt, id,
  );
}

// ── Segments ────────────────────────────────────────────────────────

export async function createSegment(id: string, sessionId: string, segmentNumber: number, startedAt: string): Promise<void> {
  await getDb().runAsync(
    'INSERT INTO session_segments (id, session_id, segment_number, started_at, synced) VALUES (?, ?, ?, ?, 0)',
    id, sessionId, segmentNumber, startedAt,
  );
}

export async function endSegment(id: string, endedAt: string): Promise<void> {
  await getDb().runAsync(
    'UPDATE session_segments SET ended_at = ?, synced = 0 WHERE id = ?',
    endedAt, id,
  );
}

// ── Attempts ────────────────────────────────────────────────────────

export async function createAttempt(
  id: string, segmentId: string, curriculumItemId: string,
  ostinato: Ostinato, tempo: number, mistakes: number, ostinatoBroke: boolean,
): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO attempts (id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    id, segmentId, curriculumItemId, ostinato, tempo, mistakes, ostinatoBroke ? 1 : 0,
  );
}

export async function deleteAttempt(id: string): Promise<void> {
  await getDb().runAsync(
    "UPDATE attempts SET deleted_at = datetime('now'), synced = 0 WHERE id = ?", id,
  );
}

export async function getAttemptsBySegment(segmentId: string): Promise<AttemptRow[]> {
  return getDb().getAllAsync<AttemptRow>(
    'SELECT * FROM attempts WHERE session_segment_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    segmentId,
  );
}

export async function getAttemptsBySegmentAndOstinato(segmentId: string, ostinato: Ostinato): Promise<AttemptRow[]> {
  return getDb().getAllAsync<AttemptRow>(
    'SELECT * FROM attempts WHERE session_segment_id = ? AND ostinato = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    segmentId, ostinato,
  );
}

export async function getOstinatoStatusesForSegment(
  segmentId: string,
): Promise<Map<Ostinato, { passed: boolean; attemptCount: number }>> {
  const rows = await getDb().getAllAsync<{ ostinato: Ostinato; attempt_count: number; has_passing: number }>(
    `SELECT ostinato, COUNT(*) as attempt_count,
       MAX(CASE WHEN mistakes <= 3 AND ostinato_broke = 0 THEN 1 ELSE 0 END) as has_passing
     FROM attempts WHERE session_segment_id = ? AND deleted_at IS NULL GROUP BY ostinato`,
    segmentId,
  );
  const map = new Map<Ostinato, { passed: boolean; attemptCount: number }>();
  for (const row of rows) {
    map.set(row.ostinato, { passed: row.has_passing === 1, attemptCount: row.attempt_count });
  }
  return map;
}

export async function getSegmentSummary(segmentId: string): Promise<{
  attemptCount: number; ostinatosPassed: number; avgMistakes: number;
}> {
  const row = await getDb().getFirstAsync<{ attempt_count: number; ostinatos_passed: number; avg_mistakes: number }>(
    `SELECT COUNT(*) as attempt_count,
       COUNT(DISTINCT CASE WHEN mistakes <= 3 AND ostinato_broke = 0 THEN ostinato END) as ostinatos_passed,
       ROUND(AVG(mistakes), 1) as avg_mistakes
     FROM attempts WHERE session_segment_id = ? AND deleted_at IS NULL`,
    segmentId,
  );
  return { attemptCount: row?.attempt_count ?? 0, ostinatosPassed: row?.ostinatos_passed ?? 0, avgMistakes: row?.avg_mistakes ?? 0 };
}

// ── History ─────────────────────────────────────────────────────────

export async function getAllSessions(): Promise<{
  id: string; started_at: string; ended_at: string | null; curriculum_item_id: string;
  curriculum_item_name: string; segment_count: number; duration_minutes: number;
  total_attempts: number; avg_mistakes: number; min_tempo: number; max_tempo: number;
  ostinatos_passed: number; total_breaks: number;
}[]> {
  return getDb().getAllAsync(
    `SELECT ps.id, ps.started_at, ps.ended_at,
       COALESCE(a.curriculum_item_id, ps.curriculum_item_id) as curriculum_item_id,
       COALESCE(ci.name, ci2.name) as curriculum_item_name,
       COUNT(DISTINCT ss.id) as segment_count,
       (SELECT ROUND(SUM((julianday(COALESCE(ss2.ended_at, datetime('now'))) - julianday(ss2.started_at)) * 1440))
        FROM session_segments ss2 WHERE ss2.session_id = ps.id AND ss2.deleted_at IS NULL) as duration_minutes,
       COUNT(a.id) as total_attempts, ROUND(AVG(a.mistakes), 1) as avg_mistakes,
       MIN(a.tempo) as min_tempo, MAX(a.tempo) as max_tempo,
       COUNT(DISTINCT CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN a.ostinato END) as ostinatos_passed,
       SUM(CASE WHEN a.ostinato_broke = 1 THEN 1 ELSE 0 END) as total_breaks
     FROM practice_sessions ps
     LEFT JOIN session_segments ss ON ss.session_id = ps.id AND ss.deleted_at IS NULL
     LEFT JOIN attempts a ON a.session_segment_id = ss.id AND a.deleted_at IS NULL
     LEFT JOIN curriculum_items ci ON ci.id = a.curriculum_item_id
     LEFT JOIN curriculum_items ci2 ON ci2.id = ps.curriculum_item_id
     WHERE ps.deleted_at IS NULL GROUP BY ps.id
     HAVING COUNT(a.id) > 0 OR ps.notes IS NOT NULL OR ps.video_url IS NOT NULL
     ORDER BY ps.started_at DESC`,
  );
}

export async function getSessionSegments(sessionId: string): Promise<SessionSegmentRow[]> {
  return getDb().getAllAsync<SessionSegmentRow>(
    'SELECT * FROM session_segments WHERE session_id = ? AND deleted_at IS NULL ORDER BY segment_number', sessionId,
  );
}

export async function getSessionAttemptsGrouped(sessionId: string): Promise<AttemptRow[]> {
  return getDb().getAllAsync<AttemptRow>(
    `SELECT a.* FROM attempts a JOIN session_segments ss ON a.session_segment_id = ss.id
     WHERE ss.session_id = ? AND a.deleted_at IS NULL AND ss.deleted_at IS NULL
     ORDER BY ss.segment_number, a.ostinato, a.created_at`, sessionId,
  );
}

export async function getSessionCurriculumItemId(sessionId: string): Promise<string | null> {
  const session = await getDb().getFirstAsync<{ curriculum_item_id: string | null }>(
    'SELECT curriculum_item_id FROM practice_sessions WHERE id = ? AND deleted_at IS NULL', sessionId,
  );
  if (session?.curriculum_item_id) return session.curriculum_item_id;
  const row = await getDb().getFirstAsync<{ curriculum_item_id: string }>(
    `SELECT DISTINCT a.curriculum_item_id FROM attempts a
     JOIN session_segments ss ON a.session_segment_id = ss.id
     WHERE ss.session_id = ? AND a.deleted_at IS NULL LIMIT 1`, sessionId,
  );
  return row?.curriculum_item_id ?? null;
}

// ── Session Management ──────────────────────────────────────────────

export async function getSessionById(id: string): Promise<{ id: string; started_at: string; ended_at: string | null } | null> {
  return getDb().getFirstAsync<{ id: string; started_at: string; ended_at: string | null }>(
    'SELECT id, started_at, ended_at FROM practice_sessions WHERE id = ? AND deleted_at IS NULL', id,
  );
}

export async function getSessionNotes(id: string): Promise<string | null> {
  const row = await getDb().getFirstAsync<{ notes: string | null }>('SELECT notes FROM practice_sessions WHERE id = ?', id);
  return row?.notes ?? null;
}

export async function updateSessionNotes(id: string, notes: string): Promise<void> {
  await getDb().runAsync('UPDATE practice_sessions SET notes = ?, synced = 0 WHERE id = ?', notes || null, id);
}

export async function getSessionVideoUrl(id: string): Promise<string | null> {
  const row = await getDb().getFirstAsync<{ video_url: string | null }>('SELECT video_url FROM practice_sessions WHERE id = ?', id);
  return row?.video_url ?? null;
}

export async function updateSessionVideoUrl(id: string, videoUrl: string): Promise<void> {
  await getDb().runAsync('UPDATE practice_sessions SET video_url = ?, synced = 0 WHERE id = ?', videoUrl || null, id);
}

export async function reopenSession(id: string): Promise<void> {
  await getDb().runAsync('UPDATE practice_sessions SET ended_at = NULL, synced = 0 WHERE id = ?', id);
}

export async function deleteSession(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE attempts SET deleted_at = datetime('now'), synced = 0
     WHERE session_segment_id IN (SELECT id FROM session_segments WHERE session_id = ?) AND deleted_at IS NULL`, id,
  );
  await db.runAsync("UPDATE session_segments SET deleted_at = datetime('now'), synced = 0 WHERE session_id = ? AND deleted_at IS NULL", id);
  await db.runAsync("UPDATE practice_sessions SET deleted_at = datetime('now'), synced = 0 WHERE id = ?", id);
}

export async function getSegmentById(id: string): Promise<SessionSegmentRow | null> {
  return getDb().getFirstAsync<SessionSegmentRow>('SELECT * FROM session_segments WHERE id = ? AND deleted_at IS NULL', id);
}

export async function reopenSegment(id: string): Promise<void> {
  await getDb().runAsync('UPDATE session_segments SET ended_at = NULL, synced = 0 WHERE id = ?', id);
}

export async function getLastSegmentForSession(sessionId: string): Promise<SessionSegmentRow | null> {
  return getDb().getFirstAsync<SessionSegmentRow>(
    'SELECT * FROM session_segments WHERE session_id = ? AND deleted_at IS NULL ORDER BY segment_number DESC LIMIT 1', sessionId,
  );
}

export async function deleteSegment(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync("UPDATE attempts SET deleted_at = datetime('now'), synced = 0 WHERE session_segment_id = ? AND deleted_at IS NULL", id);
  await db.runAsync("UPDATE session_segments SET deleted_at = datetime('now'), synced = 0 WHERE id = ?", id);
}

// ── Progress Dashboard ──────────────────────────────────────────────

export async function getOverallStats(): Promise<{
  totalSessions: number; totalAttempts: number; totalPracticeMinutes: number; avgMistakes: number;
}> {
  const row = await getDb().getFirstAsync<{ total_sessions: number; total_attempts: number; total_minutes: number; avg_mistakes: number }>(
    `SELECT
       (SELECT COUNT(*) FROM practice_sessions ps2 WHERE ps2.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM session_segments ss2 JOIN attempts a2 ON a2.session_segment_id = ss2.id
         WHERE ss2.session_id = ps2.id AND ss2.deleted_at IS NULL AND a2.deleted_at IS NULL)) as total_sessions,
       COUNT(a.id) as total_attempts,
       (SELECT ROUND(SUM((julianday(COALESCE(ss3.ended_at, datetime('now'))) - julianday(ss3.started_at)) * 1440))
        FROM session_segments ss3 WHERE ss3.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM attempts a3 WHERE a3.session_segment_id = ss3.id AND a3.deleted_at IS NULL)) as total_minutes,
       ROUND(AVG(a.mistakes), 1) as avg_mistakes
     FROM attempts a WHERE a.deleted_at IS NULL`,
  );
  return {
    totalSessions: row?.total_sessions ?? 0, totalAttempts: row?.total_attempts ?? 0,
    totalPracticeMinutes: row?.total_minutes ?? 0, avgMistakes: row?.avg_mistakes ?? 0,
  };
}

export async function getCurriculumProgress(): Promise<{
  id: string; name: string; attemptCount: number; ostinatosPassed: number; lastPracticed: string | null;
}[]> {
  return getDb().getAllAsync(
    `SELECT ci.id, ci.name, COUNT(a.id) as attemptCount,
       COUNT(DISTINCT CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN a.ostinato END) as ostinatosPassed,
       MAX(a.created_at) as lastPracticed
     FROM curriculum_items ci LEFT JOIN attempts a ON a.curriculum_item_id = ci.id AND a.deleted_at IS NULL
     GROUP BY ci.id ORDER BY ci.sort_order`,
  );
}

export async function getMasteryGrid(curriculumItemId: string): Promise<Map<Ostinato, { status: MasteryStatus; attemptCount: number }>> {
  const rows = await getDb().getAllAsync<{
    ostinato: Ostinato; attempt_count: number; has_passing: number;
    recent_avg: number; recent_count: number; recent_breaks: number;
  }>(
    `SELECT ostinato, COUNT(*) as attempt_count,
       MAX(CASE WHEN mistakes <= 3 AND ostinato_broke = 0 THEN 1 ELSE 0 END) as has_passing,
       (SELECT AVG(sub.mistakes) FROM (SELECT mistakes FROM attempts a2
         WHERE a2.curriculum_item_id = a.curriculum_item_id AND a2.ostinato = a.ostinato AND a2.deleted_at IS NULL
         ORDER BY a2.created_at DESC LIMIT 10) sub) as recent_avg,
       (SELECT COUNT(*) FROM (SELECT id FROM attempts a3
         WHERE a3.curriculum_item_id = a.curriculum_item_id AND a3.ostinato = a.ostinato AND a3.deleted_at IS NULL
         ORDER BY a3.created_at DESC LIMIT 10)) as recent_count,
       (SELECT SUM(sub2.ostinato_broke) FROM (SELECT ostinato_broke FROM attempts a4
         WHERE a4.curriculum_item_id = a.curriculum_item_id AND a4.ostinato = a.ostinato AND a4.deleted_at IS NULL
         ORDER BY a4.created_at DESC LIMIT 10) sub2) as recent_breaks
     FROM attempts a WHERE a.curriculum_item_id = ? AND a.deleted_at IS NULL GROUP BY a.ostinato`,
    curriculumItemId,
  );
  const map = new Map<Ostinato, { status: MasteryStatus; attemptCount: number }>();
  for (const row of rows) {
    let status: MasteryStatus = 'in_progress';
    if (row.has_passing === 1) {
      status = 'passed';
      if (row.recent_count >= 10 && row.recent_avg <= 1 && row.recent_breaks === 0) status = 'mastered';
    }
    map.set(row.ostinato, { status, attemptCount: row.attempt_count });
  }
  return map;
}

export async function getTempoHistory(curriculumItemId: string): Promise<{
  ostinato: Ostinato; tempo: number; date: string; passed: boolean;
}[]> {
  const rows = await getDb().getAllAsync<{ ostinato: Ostinato; tempo: number; date: string; passed: number }>(
    `SELECT a.ostinato, a.tempo, date(a.created_at, 'localtime') as date,
       CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN 1 ELSE 0 END as passed
     FROM attempts a WHERE a.curriculum_item_id = ? AND a.deleted_at IS NULL ORDER BY a.created_at`,
    curriculumItemId,
  );
  return rows.map((r) => ({ ...r, passed: r.passed === 1 }));
}

export async function getAggregateTempoHistory(curriculumItemId: string): Promise<{
  date: string; avgTempo: number; minTempo: number; maxTempo: number;
}[]> {
  return getDb().getAllAsync(
    `SELECT date(a.created_at, 'localtime') as date, ROUND(AVG(a.tempo), 0) as avgTempo,
       MIN(a.tempo) as minTempo, MAX(a.tempo) as maxTempo
     FROM attempts a WHERE a.curriculum_item_id = ? AND a.deleted_at IS NULL
     GROUP BY date(a.created_at, 'localtime') ORDER BY date`,
    curriculumItemId,
  );
}

export async function getPracticeDays(): Promise<string[]> {
  const rows = await getDb().getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(started_at, 'localtime') as day FROM practice_sessions WHERE deleted_at IS NULL ORDER BY day`,
  );
  return rows.map((r) => r.day);
}

export async function getStreakStats(): Promise<{ current: number; longest: number; totalDays: number }> {
  const days = await getPracticeDays();
  if (days.length === 0) return { current: 0, longest: 0, totalDays: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const daySet = new Set(days);
  let current = 0;
  let checkDate = new Date(today);
  if (!daySet.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
  while (daySet.has(localDateStr(checkDate))) { current++; checkDate.setDate(checkDate.getDate() - 1); }
  let longest = 0, streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
    if (diff === 1) streak++; else { longest = Math.max(longest, streak); streak = 1; }
  }
  longest = Math.max(longest, streak);
  return { current, longest, totalDays: days.length };
}

// ── Preferences ─────────────────────────────────────────────────────

export async function getPreference(key: string): Promise<string | null> {
  const row = await getDb().getFirstAsync<{ value: string }>('SELECT value FROM user_preferences WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  await getDb().runAsync('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)', key, value);
}

// ── Sync Helpers ────────────────────────────────────────────────────

export async function getUnsyncedSessions(): Promise<{
  id: string; curriculum_item_id: string | null; started_at: string; ended_at: string | null;
  notes: string | null; video_url: string | null; deleted_at: string | null; created_at: string;
}[]> {
  return getDb().getAllAsync('SELECT id, curriculum_item_id, started_at, ended_at, notes, video_url, deleted_at, created_at FROM practice_sessions WHERE synced = 0');
}

export async function getUnsyncedSegments(): Promise<{
  id: string; session_id: string; segment_number: number; started_at: string;
  ended_at: string | null; deleted_at: string | null; created_at: string;
}[]> {
  return getDb().getAllAsync('SELECT id, session_id, segment_number, started_at, ended_at, deleted_at, created_at FROM session_segments WHERE synced = 0');
}

export async function getUnsyncedAttempts(): Promise<{
  id: string; session_segment_id: string; curriculum_item_id: string; ostinato: string;
  tempo: number; mistakes: number; ostinato_broke: number; notes: string | null;
  deleted_at: string | null; created_at: string;
}[]> {
  return getDb().getAllAsync('SELECT id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke, notes, deleted_at, created_at FROM attempts WHERE synced = 0');
}

export async function markSessionsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().runAsync(`UPDATE practice_sessions SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}

export async function markSegmentsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().runAsync(`UPDATE session_segments SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}

export async function markAttemptsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().runAsync(`UPDATE attempts SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}

export async function upsertSessionFromRemote(row: {
  id: string; curriculum_item_id: string | null; started_at: string; ended_at: string | null;
  notes: string | null; video_url: string | null; deleted_at: string | null; created_at: string;
}): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO practice_sessions (id, curriculum_item_id, started_at, ended_at, notes, video_url, deleted_at, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET
       curriculum_item_id=excluded.curriculum_item_id, started_at=excluded.started_at, ended_at=excluded.ended_at,
       notes=excluded.notes, video_url=excluded.video_url, deleted_at=excluded.deleted_at, synced=1`,
    row.id, row.curriculum_item_id, row.started_at, row.ended_at, row.notes, row.video_url, row.deleted_at, row.created_at,
  );
}

export async function upsertSegmentFromRemote(row: {
  id: string; session_id: string; segment_number: number; started_at: string;
  ended_at: string | null; deleted_at: string | null; created_at: string;
}): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO session_segments (id, session_id, segment_number, started_at, ended_at, deleted_at, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET
       session_id=excluded.session_id, segment_number=excluded.segment_number, started_at=excluded.started_at,
       ended_at=excluded.ended_at, deleted_at=excluded.deleted_at, synced=1`,
    row.id, row.session_id, row.segment_number, row.started_at, row.ended_at, row.deleted_at, row.created_at,
  );
}

export async function upsertAttemptFromRemote(row: {
  id: string; session_segment_id: string; curriculum_item_id: string; ostinato: string;
  tempo: number; mistakes: number; ostinato_broke: boolean; notes: string | null;
  deleted_at: string | null; created_at: string;
}): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO attempts (id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke, notes, deleted_at, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET
       session_segment_id=excluded.session_segment_id, curriculum_item_id=excluded.curriculum_item_id,
       ostinato=excluded.ostinato, tempo=excluded.tempo, mistakes=excluded.mistakes,
       ostinato_broke=excluded.ostinato_broke, notes=excluded.notes, deleted_at=excluded.deleted_at, synced=1`,
    row.id, row.session_segment_id, row.curriculum_item_id, row.ostinato,
    row.tempo, row.mistakes, row.ostinato_broke ? 1 : 0, row.notes, row.deleted_at, row.created_at,
  );
}

export async function getAllPreferences(): Promise<{ key: string; value: string }[]> {
  return getDb().getAllAsync('SELECT key, value FROM user_preferences');
}

export async function upsertPreferenceFromRemote(key: string, value: string): Promise<void> {
  await getDb().runAsync('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)', key, value);
}
