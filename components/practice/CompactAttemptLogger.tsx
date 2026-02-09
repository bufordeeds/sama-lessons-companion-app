import React from 'react';
import { StyleSheet, Pressable, Modal, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { OstinatoSelector } from './OstinatoSelector';
import { MistakeCounter } from './MistakeCounter';
import { useSessionStore } from '@/stores/sessionStore';
import type { Ostinato } from '@/constants/curriculum';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface CompactAttemptLoggerProps {
  visible: boolean;
  onClose: () => void;
  curriculumItemId: string;
}

export function CompactAttemptLogger({
  visible,
  onClose,
  curriculumItemId,
}: CompactAttemptLoggerProps) {
  const activeSession = useSessionStore((s) => s.activeSession);
  const {
    selectOstinato,
    incrementMistakes,
    decrementMistakes,
    toggleOstinatoBroke,
    logAttempt,
  } = useSessionStore();

  if (!activeSession) return null;

  const handleLog = () => {
    logAttempt();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <RNView style={styles.handle} />

          <Text style={styles.title}>Log Attempt</Text>

          <OstinatoSelector
            selectedOstinato={activeSession.selectedOstinato}
            onSelect={selectOstinato}
            ostinatoStatuses={new Map()}
            curriculumItemId={curriculumItemId}
          />

          <RNView style={styles.tempoRow}>
            <Text style={styles.tempoLabel}>Tempo</Text>
            <Text style={styles.tempoValue}>{activeSession.tempo} BPM</Text>
          </RNView>

          <MistakeCounter
            count={activeSession.mistakeCount}
            onIncrement={incrementMistakes}
            onDecrement={decrementMistakes}
          />

          <Pressable
            style={[
              styles.brokeButton,
              activeSession.ostinatoBroke && styles.brokeButtonActive,
            ]}
            onPress={toggleOstinatoBroke}
          >
            <Text
              style={[
                styles.brokeText,
                activeSession.ostinatoBroke && styles.brokeTextActive,
              ]}
            >
              Ostinato Broke
            </Text>
          </Pressable>

          <Pressable style={styles.logButton} onPress={handleLog}>
            <Text style={styles.logButtonText}>LOG ATTEMPT</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  tempoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tempoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  tempoValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  brokeButton: {
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  brokeButtonActive: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
  },
  brokeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
  },
  brokeTextActive: {
    color: colors.white,
  },
  logButton: {
    minHeight: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  logButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 1,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
