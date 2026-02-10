import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthService } from '@/services/AuthService';
import { SyncService } from '@/services/SyncService';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    AuthService.getSession().then((s) => {
      setSession(s);
      setIsLoading(false);
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const subscription = AuthService.onAuthStateChange((s) => {
      setSession(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    const result = await AuthService.signInWithApple();
    setSession(result.session);
    // Upload existing local data on first sign-in
    SyncService.initialUpload();
  };

  const signOut = async () => {
    await AuthService.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
