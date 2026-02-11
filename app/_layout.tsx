import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { DatabaseProvider, useDatabase } from '@/db/DatabaseProvider';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/constants/theme';
import SignInScreen from './sign-in';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function RootLayoutNav() {
  const { isReady } = useDatabase();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isReady && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isReady, isLoading]);

  if (!isReady || isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider value={darkTheme}>
        <SignInScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={darkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="session/[id]"
          options={{
            title: 'Session Detail',
            headerBackTitle: 'History',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            fullScreenGestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="sheet-music/[id]"
          options={{
            title: 'Sheet Music',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            fullScreenGestureEnabled: true,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <DatabaseProvider>
        <RootLayoutNav />
      </DatabaseProvider>
    </AuthProvider>
  );
}
