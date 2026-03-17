import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import auth from './routes/auth.js';
import sync from './routes/sync.js';
import teacher from './routes/teacher.js';
import sheets from './routes/sheets.js';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: [
      'https://sama.buford.dev',
      'http://localhost:8081',
      'http://localhost:19006',
    ],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/auth', auth);
app.route('/api/sync', sync);
app.route('/api/teacher', teacher);
app.route('/api/sheets', sheets);

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`SAMA API listening on port ${port}`);
});
