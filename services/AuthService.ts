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
   * Sign in with email + password via Supabase (web and non-iOS platforms).
   * Creates the account on first attempt if it doesn't exist.
   */
  async signInWithEmail(email: string, password: string): Promise<{
    session: Session;
    user: User;
  }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error?.message?.includes('Invalid login')) {
      // Account doesn't exist yet — sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (!signUpData.session || !signUpData.user) {
        throw new Error('Sign-up succeeded but returned no session');
      }
      return { session: signUpData.session, user: signUpData.user };
    }

    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('Sign-in succeeded but returned no session');
    }
    return { session: data.session, user: data.user };
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
