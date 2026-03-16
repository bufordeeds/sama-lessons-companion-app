import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService, type AuthUser } from '@/services/AuthService';
import { SyncService } from '@/services/SyncService';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AuthService.getStoredUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u } = await AuthService.login(email, password);
    setUser(u);
    SyncService.fullSync();
  };

  const register = async (email: string, password: string, name: string) => {
    const { user: u } = await AuthService.register(email, password, name);
    setUser(u);
    SyncService.initialUpload();
  };

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
