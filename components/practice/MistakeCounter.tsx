import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface MistakeCounterProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function MistakeCounter({
  count,
  onIncrement,
  onDecrement,
}: MistakeCounterProps) {
  return (
    <RNView style={styles.container}>
      <Text style={styles.label}>Mistakes</Text>
      <RNView style={styles.row}>
        <Pressable
          style={[styles.button, count === 0 && styles.buttonDisabled]}
          onPress={onDecrement}
          disabled={count === 0}
        >
          <Text style={[styles.buttonText, count === 0 && styles.buttonTextDisabled]}>
            -
          </Text>
        </Pressable>
        <Text style={styles.count}>{count}</Text>
        <Pressable style={styles.button} onPress={onIncrement}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
  count: {
    fontSize: fontSize.xxxl,
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'center',
  },
});
