import { Hono } from 'hono';
import { query } from '../db.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const sync = new Hono<{ Variables: { user: AuthPayload } }>();

sync.use('*', authMiddleware);

// ── Push endpoints ──────────────────────────────────────────────────

sync.post('/sessions', async (c) => {
  const userId = c.get('user').sub;
  const { rows } = await c.req.json<{ rows: any[] }>();

  for (const s of rows) {
    await query(
      `INSERT INTO practice_sessions (id, user_id, curriculum_item_id, started_at, ended_at, notes, video_url, deleted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         curriculum_item_id = EXCLUDED.curriculum_item_id,
         started_at = EXCLUDED.started_at,
         ended_at = EXCLUDED.ended_at,
         notes = EXCLUDED.notes,
         video_url = EXCLUDED.video_url,
         deleted_at = EXCLUDED.deleted_at`,
      [s.id, userId, s.curriculum_item_id, s.started_at, s.ended_at, s.notes, s.video_url, s.deleted_at, s.created_at],
    );
  }

  return c.json({ ok: true, count: rows.length });
});

sync.post('/segments', async (c) => {
  const userId = c.get('user').sub;
  const { rows } = await c.req.json<{ rows: any[] }>();

  for (const s of rows) {
    await query(
      `INSERT INTO session_segments (id, user_id, session_id, segment_number, started_at, ended_at, deleted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         segment_number = EXCLUDED.segment_number,
         started_at = EXCLUDED.started_at,
         ended_at = EXCLUDED.ended_at,
         deleted_at = EXCLUDED.deleted_at`,
      [s.id, userId, s.session_id, s.segment_number, s.started_at, s.ended_at, s.deleted_at, s.created_at],
    );
  }

  return c.json({ ok: true, count: rows.length });
});

sync.post('/attempts', async (c) => {
  const userId = c.get('user').sub;
  const { rows } = await c.req.json<{ rows: any[] }>();

  for (const a of rows) {
    await query(
      `INSERT INTO attempts (id, user_id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke, notes, deleted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         session_segment_id = EXCLUDED.session_segment_id,
         curriculum_item_id = EXCLUDED.curriculum_item_id,
         ostinato = EXCLUDED.ostinato,
         tempo = EXCLUDED.tempo,
         mistakes = EXCLUDED.mistakes,
         ostinato_broke = EXCLUDED.ostinato_broke,
         notes = EXCLUDED.notes,
         deleted_at = EXCLUDED.deleted_at`,
      [a.id, userId, a.session_segment_id, a.curriculum_item_id, a.ostinato, a.tempo, a.mistakes, a.ostinato_broke, a.notes, a.deleted_at, a.created_at],
    );
  }

  return c.json({ ok: true, count: rows.length });
});

sync.post('/preferences', async (c) => {
  const userId = c.get('user').sub;
  const { rows } = await c.req.json<{ rows: { key: string; value: string }[] }>();

  for (const p of rows) {
    await query(
      `INSERT INTO user_preferences (user_id, key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [userId, p.key, p.value],
    );
  }

  return c.json({ ok: true, count: rows.length });
});

// ── Pull endpoint ───────────────────────────────────────────────────

sync.get('/pull', async (c) => {
  const userId = c.get('user').sub;
  const since = c.req.query('since') ?? '1970-01-01T00:00:00Z';

  const [sessions, segments, attempts, preferences] = await Promise.all([
    query(
      `SELECT id, curriculum_item_id, started_at, ended_at, notes, video_url, deleted_at, created_at
       FROM practice_sessions WHERE user_id = $1 AND updated_at > $2`,
      [userId, since],
    ),
    query(
      `SELECT id, session_id, segment_number, started_at, ended_at, deleted_at, created_at
       FROM session_segments WHERE user_id = $1 AND updated_at > $2`,
      [userId, since],
    ),
    query(
      `SELECT id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke, notes, deleted_at, created_at
       FROM attempts WHERE user_id = $1 AND updated_at > $2`,
      [userId, since],
    ),
    query(
      `SELECT key, value
       FROM user_preferences WHERE user_id = $1 AND updated_at > $2`,
      [userId, since],
    ),
  ]);

  return c.json({
    sessions: sessions.rows,
    segments: segments.rows,
    attempts: attempts.rows,
    preferences: preferences.rows,
  });
});

export default sync;
