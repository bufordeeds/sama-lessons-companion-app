import React, { useState, useCallback, useLayoutEffect } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Pressable } from 'react-native';
import { getSheetById } from '@/constants/sheetMusic';
import { NotationView } from '@/components/practice/NotationView';
import { MetronomeBar } from '@/components/practice/MetronomeBar';
import { CompactAttemptLogger } from '@/components/practice/CompactAttemptLogger';
import { UndoBanner } from '@/components/practice/UndoBanner';
import { SoundPicker } from '@/components/practice/SoundPicker';
import { useSessionStore } from '@/stores/sessionStore';
import { getPreference } from '@/db/queries';
import { DEFAULT_SOUND_ID } from '@/constants/metronome';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

export default function SheetMusicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sheet = getSheetById(id ?? '');
  const navigation = useNavigation();

  // Set the header title to the sheet name
  useLayoutEffect(() => {
    if (sheet) {
      navigation.setOptions({ title: sheet.name });
    }
  }, [navigation, sheet]);

  const activeSession = useSessionStore((s) => s.activeSession);
  const lastLoggedAttemptId = useSessionStore((s) => s.lastLoggedAttemptId);
  const { undoLastAttempt, adjustTempo } = useSessionStore();

  const [loggerVisible, setLoggerVisible] = useState(false);
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const [currentSoundId, setCurrentSoundId] = useState(
    () => getPreference('metronome_sound') ?? DEFAULT_SOUND_ID,
  );

  // Local tempo for standalone use; session tempo overrides when active
  const [localTempo, setLocalTempo] = useState(100);
  const tempo = activeSession?.tempo ?? localTempo;

  const handleTempoChange = useCallback(
    (newTempo: number) => {
      if (activeSession) {
        adjustTempo(newTempo - (activeSession.tempo ?? 100));
      } else {
        setLocalTempo(newTempo);
      }
    },
    [activeSession, adjustTempo],
  );

  const handleUndo = useCallback(() => {
    undoLastAttempt();
  }, [undoLastAttempt]);

  const handleDismissUndo = useCallback(() => {
    useSessionStore.setState({ lastLoggedAttemptId: null });
  }, []);

  if (!sheet) {
    return (
      <RNView style={styles.errorContainer}>
        <Text style={styles.errorText}>Sheet music not found</Text>
      </RNView>
    );
  }

  const isReference = sheet.curriculumItemId === null;
  const canLog = !!activeSession && !isReference;

  return (
    <RNView style={styles.container}>
      {/* Notation area — takes all available space */}
      <RNView style={styles.notationArea}>
        <NotationView mxlAsset={sheet.asset} />
      </RNView>

      {/* Metronome bar */}
      <MetronomeBar
        tempo={tempo}
        onTempoChange={handleTempoChange}
        onOpenSoundPicker={() => setSoundPickerVisible(true)}
      />

      {/* Log attempt button — only when in a session and not a reference sheet */}
      {canLog && (
        <RNView style={styles.logSection}>
          <Pressable
            style={styles.logButton}
            onPress={() => setLoggerVisible(true)}
          >
            <Text style={styles.logButtonText}>Log Attempt</Text>
          </Pressable>
        </RNView>
      )}

      {/* Compact logger bottom sheet */}
      {activeSession && (
        <CompactAttemptLogger
          visible={loggerVisible}
          onClose={() => setLoggerVisible(false)}
          curriculumItemId={activeSession.curriculumItemId}
        />
      )}

      {/* Undo banner */}
      <UndoBanner
        visible={!!lastLoggedAttemptId}
        onUndo={handleUndo}
        onDismiss={handleDismissUndo}
      />

      {/* Sound picker modal */}
      <SoundPicker
        visible={soundPickerVisible}
        onClose={() => setSoundPickerVisible(false)}
        currentSoundId={currentSoundId}
        onSoundChange={setCurrentSoundId}
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notationArea: {
    flex: 1,
  },
  logSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logButton: {
    minHeight: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  logButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
  },
});
