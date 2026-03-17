import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(secret);
};

export async function signJwt(payload: AuthPayload): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<AuthPayload> {
  const { payload } = await jose.jwtVerify(token, getSecret());
  return payload as unknown as AuthPayload;
}

export function requireRole(role: string) {
  return createMiddleware<{ Variables: { user: AuthPayload } }>(async (c, next) => {
    const user = c.get('user');
    if (user.role !== role) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });
}

export const authMiddleware = createMiddleware<{
  Variables: { user: AuthPayload };
}>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization token' }, 401);
  }

  try {
    const token = header.slice(7);
    const payload = await verifyJwt(token);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});
