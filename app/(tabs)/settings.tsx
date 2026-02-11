import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  View as RNView,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { Text } from '@/components/Themed';
import { SoundPicker } from '@/components/practice/SoundPicker';
import { useAuth } from '@/providers/AuthProvider';
import { SyncService } from '@/services/SyncService';
import { getPreference, setPreference } from '@/db/queries';
import { getSoundById } from '@/constants/metronome';
import { exportSessionsCsv } from '@/utils/exportCsv';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();

  // Metronome sound
  const [soundId, setSoundId] = useState(() => getPreference('metronome_sound') ?? 'Perc_MetronomeQuartz');
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const currentSound = getSoundById(soundId);

  // Default tempo
  const [defaultTempo, setDefaultTempo] = useState(() => {
    const saved = getPreference('lastTempo');
    return saved ? parseInt(saved, 10) || 100 : 100;
  });

  // Haptics
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    return getPreference('hapticsEnabled') !== 'false';
  });

  // Sync
  const [lastSyncAt, setLastSyncAt] = useState(() => getPreference('last_sync_at'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleTempoChange = useCallback((delta: number) => {
    setDefaultTempo((prev) => {
      const next = Math.max(40, Math.min(300, prev + delta));
      setPreference('lastTempo', String(next));
      return next;
    });
  }, []);

  const handleHapticsToggle = useCallback((value: boolean) => {
    setHapticsEnabled(value);
    setPreference('hapticsEnabled', value ? 'true' : 'false');
  }, []);

  const handleSoundChange = useCallback((newSoundId: string) => {
    setSoundId(newSoundId);
  }, []);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await SyncService.fullSync();
      setLastSyncAt(getPreference('last_sync_at'));
    } catch {
      Alert.alert('Sync Error', 'Failed to sync. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  }, [signOut]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportSessionsCsv();
    } catch (err: any) {
      Alert.alert('Export Error', err.message ?? 'Failed to export sessions.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const formatSyncTime = (iso: string | null): string => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      {/* Metronome */}
      <Text style={styles.sectionTitle}>Metronome</Text>
      <RNView style={styles.card}>
        <Pressable style={styles.row} onPress={() => setSoundPickerVisible(true)}>
          <Text style={styles.rowLabel}>Click Sound</Text>
          <RNView style={styles.rowRight}>
            <Text style={styles.rowValue}>{currentSound.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </RNView>
        </Pressable>

        <RNView style={styles.separator} />

        <RNView style={styles.row}>
          <Text style={styles.rowLabel}>Default Tempo</Text>
          <RNView style={styles.tempoControls}>
            <Pressable style={styles.tempoButton} onPress={() => handleTempoChange(-5)}>
              <Text style={styles.tempoButtonText}>-5</Text>
            </Pressable>
            <Text style={styles.tempoValue}>{defaultTempo}</Text>
            <Pressable style={styles.tempoButton} onPress={() => handleTempoChange(5)}>
              <Text style={styles.tempoButtonText}>+5</Text>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>

      {/* Haptics */}
      <Text style={styles.sectionTitle}>Haptics</Text>
      <RNView style={styles.card}>
        <RNView style={styles.row}>
          <Text style={styles.rowLabel}>Haptic Feedback</Text>
          <Switch
            value={hapticsEnabled}
            onValueChange={handleHapticsToggle}
            trackColor={{ false: colors.border, true: colors.primaryDim }}
            thumbColor={hapticsEnabled ? colors.primary : colors.textMuted}
          />
        </RNView>
      </RNView>

      {/* Sync & Account */}
      <Text style={styles.sectionTitle}>Sync & Account</Text>
      <RNView style={styles.card}>
        <RNView style={styles.row}>
          <Text style={styles.rowLabel}>Last Synced</Text>
          <Text style={styles.rowValue}>{formatSyncTime(lastSyncAt)}</Text>
        </RNView>

        <RNView style={styles.separator} />

        <Pressable
          style={styles.row}
          onPress={handleSyncNow}
          disabled={isSyncing}
        >
          <Text style={styles.rowLabel}>Sync Now</Text>
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.actionText}>Sync</Text>
          )}
        </Pressable>

        <RNView style={styles.separator} />

        <Pressable style={styles.row} onPress={handleSignOut}>
          <Text style={[styles.rowLabel, { color: colors.danger }]}>Sign Out</Text>
        </Pressable>
      </RNView>

      {/* Data */}
      <Text style={styles.sectionTitle}>Data</Text>
      <RNView style={styles.card}>
        <Pressable
          style={styles.row}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.rowLabel}>Export Sessions (CSV)</Text>
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.actionText}>Export</Text>
          )}
        </Pressable>
      </RNView>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <RNView style={styles.card}>
        <RNView style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>{appVersion}</Text>
        </RNView>
      </RNView>

      <SoundPicker
        visible={soundPickerVisible}
        onClose={() => setSoundPickerVisible(false)}
        currentSoundId={soundId}
        onSoundChange={handleSoundChange}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: touchTarget.min,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  rowValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  tempoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tempoButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempoButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  tempoValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
});
