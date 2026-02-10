import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Platform, Pressable } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/constants/theme';

export default function SignInScreen() {
  const { signIn, devBypass } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (error: any) {
      // User cancelled — not an error
      if (error.code === 'ERR_REQUEST_CANCELED') {
        setIsSigningIn(false);
        return;
      }
      Alert.alert('Sign In Failed', error.message ?? 'Please try again.');
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
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleSignIn}
          />
        ) : (
          <Text style={styles.platformNote}>
            Sign in with Apple is only available on iOS devices.
          </Text>
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
  platformNote: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
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
