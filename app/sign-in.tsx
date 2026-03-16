import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Pressable, TextInput } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/constants/theme';

export default function SignInScreen() {
  const { login, register } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLogin = async () => {
    if (isSigningIn || !email.trim() || !password) return;
    setIsSigningIn(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message ?? 'Please try again.');
      setIsSigningIn(false);
    }
  };

  const handleRegister = async () => {
    if (isSigningIn || !email.trim() || !password || !name.trim()) return;
    setIsSigningIn(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message ?? 'Please try again.');
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
          {isRegistering
            ? 'Create an account to get started'
            : 'Sign in to sync your practice data across devices'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.form}>
          {isRegistering && (
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}
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
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
          />
          <Pressable
            style={[styles.primaryButton, isSigningIn && styles.buttonDisabled]}
            onPress={isRegistering ? handleRegister : handleLogin}
            disabled={isSigningIn}
          >
            <Text style={styles.primaryButtonText}>
              {isSigningIn
                ? (isRegistering ? 'Creating Account...' : 'Signing In...')
                : (isRegistering ? 'Create Account' : 'Sign In')}
            </Text>
          </Pressable>
          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsRegistering(!isRegistering)}
          >
            <Text style={styles.toggleText}>
              {isRegistering
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create One"}
            </Text>
          </Pressable>
        </View>
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
  form: {
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
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: colors.primary,
  },
});
