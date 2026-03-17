import { Hono } from 'hono';
import { query } from '../db.js';
import { authMiddleware, requireRole, type AuthPayload } from '../middleware/auth.js';
import { uploadFile, getPresignedUrl } from '../lib/minio.js';

const sheets = new Hono<{ Variables: { user: AuthPayload } }>();

sheets.use('*', authMiddleware);

// Upload a PDF (teacher only)
sheets.post('/upload', requireRole('teacher'), async (c) => {
  const teacherId = c.get('user').sub;
  const body = await c.req.parseBody();

  const file = body['file'];
  if (!file || typeof file === 'string') {
    return c.json({ error: 'File is required' }, 400);
  }

  const title = String(body['title'] || '');
  if (!title) {
    return c.json({ error: 'Title is required' }, 400);
  }

  const curriculumItemId = body['curriculum_item_id']
    ? String(body['curriculum_item_id'])
    : null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/pdf';
  const ext = contentType === 'application/pdf' ? 'pdf' : 'bin';

  // Generate a unique key
  const id = crypto.randomUUID();
  const fileKey = `sheets/${id}.${ext}`;

  await uploadFile(fileKey, buffer, contentType);

  await query(
    `INSERT INTO sheet_music (id, teacher_id, title, file_key, file_type, file_size, curriculum_item_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, teacherId, title, fileKey, contentType, buffer.length, curriculumItemId],
  );

  return c.json({ id, title, file_key: fileKey });
});

// List all sheet music (both roles)
sheets.get('/', async (c) => {
  const result = await query(
    `SELECT sm.id, sm.title, sm.file_type, sm.curriculum_item_id, sm.created_at,
       u.name as teacher_name
     FROM sheet_music sm
     JOIN users u ON u.id = sm.teacher_id
     WHERE sm.deleted_at IS NULL
     ORDER BY sm.created_at DESC`,
  );

  return c.json({
    sheets: result.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      fileType: r.file_type,
      curriculumItemId: r.curriculum_item_id,
      teacherName: r.teacher_name,
      createdAt: r.created_at,
    })),
  });
});

// Get presigned download URL (both roles)
sheets.get('/:id/url', async (c) => {
  const sheetId = c.req.param('id');

  const result = await query(
    'SELECT file_key FROM sheet_music WHERE id = $1 AND deleted_at IS NULL',
    [sheetId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: 'Sheet not found' }, 404);
  }

  const url = await getPresignedUrl(result.rows[0].file_key);
  return c.json({ url });
});

// Soft-delete (teacher only)
sheets.delete('/:id', requireRole('teacher'), async (c) => {
  const sheetId = c.req.param('id');
  const teacherId = c.get('user').sub;

  const result = await query(
    'UPDATE sheet_music SET deleted_at = NOW() WHERE id = $1 AND teacher_id = $2 AND deleted_at IS NULL RETURNING id',
    [sheetId, teacherId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: 'Sheet not found or not yours' }, 404);
  }

  return c.json({ ok: true });
});

export default sheets;
