import { apiFetch, getToken, setToken, clearToken, decodeToken, isTokenExpired } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export const AuthService = {
  async register(email: string, password: string, name: string): Promise<{ token: string; user: AuthUser }> {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await setToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);
    return data;
  },

  async getStoredUser(): Promise<AuthUser | null> {
    const token = await getToken();
    if (!token || isTokenExpired(token)) {
      if (token) await clearToken();
      return null;
    }
    const payload = decodeToken(token);
    if (!payload) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: null,
      role: payload.role,
    };
  },

  async signOut(): Promise<void> {
    await clearToken();
  },
};
