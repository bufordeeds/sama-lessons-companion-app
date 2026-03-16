import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { signJwt, authMiddleware, type AuthPayload } from '../middleware/auth.js';

const auth = new Hono<{ Variables: { user: AuthPayload } }>();

auth.post('/register', async (c) => {
  const { email, password, name } = await c.req.json<{
    email: string;
    password: string;
    name?: string;
  }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query<{ id: string; role: string }>(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, role',
    [email, passwordHash, name ?? null],
  );

  const user = result.rows[0];
  const token = await signJwt({ sub: user.id, email, role: user.role });

  return c.json({ token, user: { id: user.id, email, name, role: user.role } });
});

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    role: string;
  }>('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await signJwt({ sub: user.id, email: user.email, role: user.role });

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

auth.get('/me', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const result = await query<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  }>('SELECT id, email, name, role FROM users WHERE id = $1', [sub]);

  if (result.rows.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user: result.rows[0] });
});

export default auth;
