import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Platform, Pressable, TextInput } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/constants/theme';

export default function SignInScreen() {
  const { signIn, sendMagicLink, devBypass } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleAppleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        setIsSigningIn(false);
        return;
      }
      Alert.alert('Sign In Failed', error.message ?? 'Please try again.');
      setIsSigningIn(false);
    }
  };

  const handleMagicLink = async () => {
    if (isSigningIn || !email.trim()) return;
    setIsSigningIn(true);
    try {
      await sendMagicLink(email.trim());
      setMagicLinkSent(true);
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message ?? 'Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>SAMA Drum Practice</Text>
        <Text style={styles.subtitle}>
          Sign in to sync your practice data across devices
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {Platform.OS === 'ios' ? (
          <AppleSignInButton onPress={handleAppleSignIn} />
        ) : magicLinkSent ? (
          <View style={styles.emailForm}>
            <Text style={styles.magicLinkSent}>
              Check your email for a sign-in link.
            </Text>
            <Pressable
              style={styles.emailButton}
              onPress={() => { setMagicLinkSent(false); setEmail(''); }}
            >
              <Text style={styles.emailButtonText}>Try a different email</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emailForm}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Pressable
              style={[styles.emailButton, isSigningIn && styles.emailButtonDisabled]}
              onPress={handleMagicLink}
              disabled={isSigningIn}
            >
              <Text style={styles.emailButtonText}>
                {isSigningIn ? 'Sending...' : 'Send Sign-In Link'}
              </Text>
            </Pressable>
            <Text style={styles.emailNote}>
              We'll email you a link to sign in — no password needed.
            </Text>
          </View>
        )}
        {__DEV__ && (
          <Pressable style={styles.devBypass} onPress={() => devBypass()}>
            <Text style={styles.devBypassText}>Skip (Dev Only)</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Lazy-loaded Apple Sign-In button (avoids importing expo-apple-authentication on web) */
function AppleSignInButton({ onPress }: { onPress: () => void }) {
  const AppleAuthentication = require('expo-apple-authentication');
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={12}
      style={styles.appleButton}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 80,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  appleButton: {
    width: 280,
    height: 52,
  },
  emailForm: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  emailButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  emailButtonDisabled: {
    opacity: 0.6,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  magicLinkSent: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emailNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  devBypass: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devBypassText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
