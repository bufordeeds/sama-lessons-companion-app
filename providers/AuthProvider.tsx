import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthService } from '@/services/AuthService';
import { SyncService } from '@/services/SyncService';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  devBypass: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  devBypass: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);

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
    SyncService.initialUpload();
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await AuthService.signInWithEmail(email, password);
    setSession(result.session);
    SyncService.initialUpload();
  };

  const signOut = async () => {
    await AuthService.signOut();
    setSession(null);
    setDevMode(false);
  };

  const devBypass = async () => {
    if (!__DEV__) return;
    const email = process.env.EXPO_PUBLIC_DEV_EMAIL;
    const password = process.env.EXPO_PUBLIC_DEV_PASSWORD;
    if (!email || !password) {
      setDevMode(true); // fall back to offline-only bypass
      return;
    }

    // Try sign in, if user doesn't exist yet, sign up first
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.message?.includes('Invalid login')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        console.warn('Dev sign-up failed:', signUpError.message);
        setDevMode(true);
        return;
      }
      if (signUpData.session) {
        setSession(signUpData.session);
        SyncService.initialUpload();
        return;
      }
    }
    if (data?.session) {
      setSession(data.session);
      SyncService.initialUpload();
    } else {
      setDevMode(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        isLoading,
        isAuthenticated: !!session || devMode,
        signIn,
        signInWithEmail,
        signOut,
        devBypass,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
