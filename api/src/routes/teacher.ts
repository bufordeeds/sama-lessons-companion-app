import { Hono } from 'hono';
import { query } from '../db.js';
import { authMiddleware, requireRole, type AuthPayload } from '../middleware/auth.js';

const teacher = new Hono<{ Variables: { user: AuthPayload } }>();

teacher.use('*', authMiddleware);
teacher.use('*', requireRole('teacher'));

// List students linked to this teacher
teacher.get('/students', async (c) => {
  const teacherId = c.get('user').sub;

  const result = await query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN teacher_students ts ON ts.student_id = u.id
     WHERE ts.teacher_id = $1
     ORDER BY u.name`,
    [teacherId],
  );

  return c.json({ students: result.rows });
});

// Get a student's progress data
teacher.get('/students/:id/progress', async (c) => {
  const teacherId = c.get('user').sub;
  const studentId = c.req.param('id');

  // Verify teacher-student relationship
  const link = await query(
    'SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
    [teacherId, studentId],
  );
  if (link.rows.length === 0) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const [stats, curriculumProgress, streaks, practiceDays] = await Promise.all([
    // Overall stats
    query(
      `SELECT
         (SELECT COUNT(DISTINCT ps.id) FROM practice_sessions ps
           JOIN session_segments ss ON ss.session_id = ps.id AND ss.deleted_at IS NULL
           JOIN attempts a ON a.session_segment_id = ss.id AND a.deleted_at IS NULL
           WHERE ps.user_id = $1 AND ps.deleted_at IS NULL) as total_sessions,
         COUNT(a.id) as total_attempts,
         (SELECT ROUND(EXTRACT(EPOCH FROM SUM(
           COALESCE(ss2.ended_at, NOW()) - ss2.started_at
         )) / 60) FROM session_segments ss2
           JOIN practice_sessions ps2 ON ps2.id = ss2.session_id
           WHERE ps2.user_id = $1 AND ss2.deleted_at IS NULL AND ps2.deleted_at IS NULL
           AND EXISTS (SELECT 1 FROM attempts a2 WHERE a2.session_segment_id = ss2.id AND a2.deleted_at IS NULL)
         ) as total_minutes,
         ROUND(AVG(a.mistakes)::numeric, 1) as avg_mistakes
       FROM attempts a
       JOIN session_segments ss ON ss.id = a.session_segment_id AND ss.deleted_at IS NULL
       JOIN practice_sessions ps ON ps.id = ss.session_id AND ps.deleted_at IS NULL
       WHERE a.user_id = $1 AND a.deleted_at IS NULL`,
      [studentId],
    ),
    // Curriculum progress
    query(
      `SELECT ci.id, ci.name, ci.sort_order,
         COUNT(a.id) as attempt_count,
         COUNT(DISTINCT CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = false THEN a.ostinato END) as ostinatos_passed,
         MAX(a.created_at) as last_practiced
       FROM curriculum_items ci
       LEFT JOIN attempts a ON a.curriculum_item_id = ci.id AND a.user_id = $1 AND a.deleted_at IS NULL
       GROUP BY ci.id, ci.name, ci.sort_order
       ORDER BY ci.sort_order`,
      [studentId],
    ),
    // Streak stats (practice days)
    query(
      `SELECT DISTINCT DATE(ps.started_at AT TIME ZONE 'UTC') as day
       FROM practice_sessions ps
       WHERE ps.user_id = $1 AND ps.deleted_at IS NULL
       ORDER BY day`,
      [studentId],
    ),
    // Practice days for calendar
    query(
      `SELECT DISTINCT DATE(ps.started_at AT TIME ZONE 'UTC') as day
       FROM practice_sessions ps
       WHERE ps.user_id = $1 AND ps.deleted_at IS NULL
       ORDER BY day`,
      [studentId],
    ),
  ]);

  const statsRow = stats.rows[0];
  const days = streaks.rows.map((r: any) => r.day?.toISOString?.()?.slice(0, 10) ?? String(r.day));

  // Calculate streaks from practice days
  let current = 0;
  let longest = 0;
  if (days.length > 0) {
    const daySet = new Set(days);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const checkDate = new Date(today);
    if (!daySet.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    while (daySet.has(fmt(checkDate))) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
      if (diff === 1) streak++;
      else { longest = Math.max(longest, streak); streak = 1; }
    }
    longest = Math.max(longest, streak);
  }

  return c.json({
    stats: {
      totalSessions: Number(statsRow?.total_sessions ?? 0),
      totalAttempts: Number(statsRow?.total_attempts ?? 0),
      totalPracticeMinutes: Number(statsRow?.total_minutes ?? 0),
      avgMistakes: Number(statsRow?.avg_mistakes ?? 0),
    },
    curriculumProgress: curriculumProgress.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      attemptCount: Number(r.attempt_count),
      ostinatosPassed: Number(r.ostinatos_passed),
      lastPracticed: r.last_practiced,
    })),
    streaks: { current, longest, totalDays: days.length },
    practiceDays: practiceDays.rows.map((r: any) => r.day?.toISOString?.()?.slice(0, 10) ?? String(r.day)),
  });
});

// Get mastery grid for a student + curriculum item
teacher.get('/students/:id/mastery/:curriculumItemId', async (c) => {
  const teacherId = c.get('user').sub;
  const studentId = c.req.param('id');
  const curriculumItemId = c.req.param('curriculumItemId');

  const link = await query(
    'SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
    [teacherId, studentId],
  );
  if (link.rows.length === 0) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const result = await query(
    `SELECT a.ostinato, COUNT(*) as attempt_count,
       MAX(CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = false THEN 1 ELSE 0 END) as has_passing,
       (SELECT AVG(sub.mistakes) FROM (
         SELECT mistakes FROM attempts a2
         WHERE a2.curriculum_item_id = a.curriculum_item_id AND a2.ostinato = a.ostinato
           AND a2.user_id = $1 AND a2.deleted_at IS NULL
         ORDER BY a2.created_at DESC LIMIT 10
       ) sub) as recent_avg,
       (SELECT COUNT(*) FROM (
         SELECT id FROM attempts a3
         WHERE a3.curriculum_item_id = a.curriculum_item_id AND a3.ostinato = a.ostinato
           AND a3.user_id = $1 AND a3.deleted_at IS NULL
         ORDER BY a3.created_at DESC LIMIT 10
       ) sub2) as recent_count,
       (SELECT COALESCE(SUM(CASE WHEN sub3.ostinato_broke THEN 1 ELSE 0 END), 0) FROM (
         SELECT ostinato_broke FROM attempts a4
         WHERE a4.curriculum_item_id = a.curriculum_item_id AND a4.ostinato = a.ostinato
           AND a4.user_id = $1 AND a4.deleted_at IS NULL
         ORDER BY a4.created_at DESC LIMIT 10
       ) sub3) as recent_breaks
     FROM attempts a
     WHERE a.curriculum_item_id = $2 AND a.user_id = $1 AND a.deleted_at IS NULL
     GROUP BY a.ostinato, a.curriculum_item_id`,
    [studentId, curriculumItemId],
  );

  const grid: Record<string, { status: string; attemptCount: number }> = {};
  for (const row of result.rows) {
    let status = 'in_progress';
    if (Number(row.has_passing) === 1) {
      status = 'passed';
      if (Number(row.recent_count) >= 10 && Number(row.recent_avg) <= 1 && Number(row.recent_breaks) === 0) {
        status = 'mastered';
      }
    }
    grid[row.ostinato] = { status, attemptCount: Number(row.attempt_count) };
  }

  return c.json({ grid });
});

// Get tempo history for a student + curriculum item
teacher.get('/students/:id/tempo/:curriculumItemId', async (c) => {
  const teacherId = c.get('user').sub;
  const studentId = c.req.param('id');
  const curriculumItemId = c.req.param('curriculumItemId');

  const link = await query(
    'SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
    [teacherId, studentId],
  );
  if (link.rows.length === 0) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const [aggregate, byOstinato] = await Promise.all([
    query(
      `SELECT DATE(a.created_at AT TIME ZONE 'UTC') as date,
         ROUND(AVG(a.tempo)) as avg_tempo,
         MIN(a.tempo) as min_tempo,
         MAX(a.tempo) as max_tempo
       FROM attempts a
       WHERE a.curriculum_item_id = $1 AND a.user_id = $2 AND a.deleted_at IS NULL
       GROUP BY DATE(a.created_at AT TIME ZONE 'UTC')
       ORDER BY date`,
      [curriculumItemId, studentId],
    ),
    query(
      `SELECT a.ostinato, a.tempo,
         DATE(a.created_at AT TIME ZONE 'UTC') as date,
         CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = false THEN true ELSE false END as passed
       FROM attempts a
       WHERE a.curriculum_item_id = $1 AND a.user_id = $2 AND a.deleted_at IS NULL
       ORDER BY a.created_at`,
      [curriculumItemId, studentId],
    ),
  ]);

  return c.json({
    aggregateData: aggregate.rows.map((r: any) => ({
      date: r.date?.toISOString?.()?.slice(0, 10) ?? String(r.date),
      avgTempo: Number(r.avg_tempo),
      minTempo: Number(r.min_tempo),
      maxTempo: Number(r.max_tempo),
    })),
    ostinatoData: byOstinato.rows.map((r: any) => ({
      ostinato: r.ostinato,
      tempo: Number(r.tempo),
      date: r.date?.toISOString?.()?.slice(0, 10) ?? String(r.date),
      passed: r.passed,
    })),
  });
});

// Get a student's session history
teacher.get('/students/:id/sessions', async (c) => {
  const teacherId = c.get('user').sub;
  const studentId = c.req.param('id');

  const link = await query(
    'SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
    [teacherId, studentId],
  );
  if (link.rows.length === 0) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const result = await query(
    `SELECT ps.id, ps.started_at, ps.ended_at,
       COALESCE(ci.name, ci2.name) as curriculum_item_name,
       ps.notes, ps.video_url,
       COUNT(DISTINCT ss.id) as segment_count,
       COUNT(a.id) as attempt_count,
       ROUND(AVG(a.mistakes)::numeric, 1) as avg_mistakes,
       MIN(a.tempo) as min_tempo,
       MAX(a.tempo) as max_tempo
     FROM practice_sessions ps
     LEFT JOIN session_segments ss ON ss.session_id = ps.id AND ss.deleted_at IS NULL
     LEFT JOIN attempts a ON a.session_segment_id = ss.id AND a.deleted_at IS NULL
     LEFT JOIN curriculum_items ci ON ci.id = a.curriculum_item_id
     LEFT JOIN curriculum_items ci2 ON ci2.id = ps.curriculum_item_id
     WHERE ps.user_id = $1 AND ps.deleted_at IS NULL
     GROUP BY ps.id, ps.started_at, ps.ended_at, ps.notes, ps.video_url, ci.name, ci2.name
     HAVING COUNT(a.id) > 0 OR ps.notes IS NOT NULL OR ps.video_url IS NOT NULL
     ORDER BY ps.started_at DESC`,
    [studentId],
  );

  return c.json({
    sessions: result.rows.map((r: any) => ({
      id: r.id,
      started_at: r.started_at,
      ended_at: r.ended_at,
      curriculum_item_name: r.curriculum_item_name,
      notes: r.notes,
      video_url: r.video_url,
      segment_count: Number(r.segment_count),
      attempt_count: Number(r.attempt_count),
      avg_mistakes: Number(r.avg_mistakes ?? 0),
      min_tempo: r.min_tempo ? Number(r.min_tempo) : null,
      max_tempo: r.max_tempo ? Number(r.max_tempo) : null,
    })),
  });
});

export default teacher;
