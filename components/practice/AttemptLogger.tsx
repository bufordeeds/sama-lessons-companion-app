import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { TempoInput } from './TempoInput';
import { MistakeCounter } from './MistakeCounter';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface AttemptLoggerProps {
  tempo: number;
  mistakeCount: number;
  ostinatoBroke: boolean;
  onAdjustTempo: (delta: number) => void;
  onSetTempo: (tempo: number) => void;
  onIncrementMistakes: () => void;
  onDecrementMistakes: () => void;
  onToggleBroke: () => void;
  onLogAttempt: () => void;
}

export function AttemptLogger({
  tempo,
  mistakeCount,
  ostinatoBroke,
  onAdjustTempo,
  onSetTempo,
  onIncrementMistakes,
  onDecrementMistakes,
  onToggleBroke,
  onLogAttempt,
}: AttemptLoggerProps) {
  return (
    <RNView style={styles.container}>
      <TempoInput tempo={tempo} onAdjust={onAdjustTempo} onSet={onSetTempo} />

      <MistakeCounter
        count={mistakeCount}
        onIncrement={onIncrementMistakes}
        onDecrement={onDecrementMistakes}
      />

      <Pressable
        style={[styles.brokeButton, ostinatoBroke && styles.brokeButtonActive]}
        onPress={onToggleBroke}
      >
        <Text
          style={[styles.brokeText, ostinatoBroke && styles.brokeTextActive]}
        >
          Ostinato Broke
        </Text>
      </Pressable>

      <Pressable style={styles.logButton} onPress={onLogAttempt}>
        <Text style={styles.logButtonText}>LOG ATTEMPT</Text>
      </Pressable>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
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
});
