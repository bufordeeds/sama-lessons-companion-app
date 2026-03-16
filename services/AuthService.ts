import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const AuthService = {
  /**
   * Sign in with Apple (iOS only), then exchange the identity token with Supabase.
   * Apple only provides the user's full name on the FIRST sign-in,
   * so we capture and return it here for the caller to persist if needed.
   */
  async signInWithApple(): Promise<{
    session: Session;
    user: User;
    fullName?: string;
  }> {
    const AppleAuthentication = await import('expo-apple-authentication');

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token returned from Apple');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('Supabase sign-in succeeded but returned no session');
    }

    let fullName: string | undefined;
    if (credential.fullName) {
      const parts = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ].filter(Boolean);
      if (parts.length > 0) fullName = parts.join(' ');
    }

    return { session: data.session, user: data.user, fullName };
  },

  /**
   * Send a magic link to the user's email (web and non-iOS platforms).
   * Works regardless of how the account was created (Apple OAuth, email, etc.).
   */
  async sendMagicLink(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return data.subscription;
  },
};
