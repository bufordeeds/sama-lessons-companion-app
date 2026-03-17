import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { SyncService } from '@/services/SyncService';
import { useAuth } from '@/providers/AuthProvider';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  // Sync on app foreground (students only)
  useEffect(() => {
    if (isTeacher) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        SyncService.fullSync();
      }
      appState.current = nextState;
    });

    // Initial sync on mount
    SyncService.fullSync();

    return () => sub.remove();
  }, [isTeacher]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShown: useClientOnlyValue(false, true),
      }}>
      {isTeacher ? (
        <>
          <Tabs.Screen
            name="students"
            options={{
              title: 'Students',
              tabBarIcon: ({ color }) => <TabBarIcon name="people-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="music"
            options={{
              title: 'Music',
              tabBarIcon: ({ color }) => <TabBarIcon name="library-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <TabBarIcon name="settings-outline" color={color} />,
            }}
          />
          {/* Hide student-only tabs */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="history" options={{ href: null }} />
          <Tabs.Screen name="progress" options={{ href: null }} />
        </>
      ) : (
        <>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Practice',
              tabBarIcon: ({ color }) => <TabBarIcon name="musical-notes" color={color} />,
              headerRight: () => <SyncIndicator />,
            }}
          />
          <Tabs.Screen
            name="music"
            options={{
              title: 'Music',
              tabBarIcon: ({ color }) => <TabBarIcon name="library-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarIcon: ({ color }) => <TabBarIcon name="time-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="progress"
            options={{
              title: 'Progress',
              tabBarIcon: ({ color }) => <TabBarIcon name="stats-chart" color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <TabBarIcon name="settings-outline" color={color} />,
            }}
          />
          {/* Hide teacher-only tabs */}
          <Tabs.Screen name="students" options={{ href: null }} />
        </>
      )}
    </Tabs>
  );
}
