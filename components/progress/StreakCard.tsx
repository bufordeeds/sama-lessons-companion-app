import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize } from '@/constants/theme';

interface StreakCardProps {
  current: number;
  longest: number;
  totalDays: number;
}

export function StreakCard({ current, longest, totalDays }: StreakCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mainStat}>
        <Text style={[styles.streakNumber, current > 0 && styles.streakActive]}>
          {current}
        </Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>
      <View style={styles.secondaryRow}>
        <View style={styles.secondaryStat}>
          <Text style={styles.secondaryValue}>{longest}</Text>
          <Text style={styles.secondaryLabel}>longest</Text>
        </View>
        <View style={styles.secondaryStat}>
          <Text style={styles.secondaryValue}>{totalDays}</Text>
          <Text style={styles.secondaryLabel}>total days</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  mainStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  streakActive: {
    color: colors.primary,
  },
  streakLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
  secondaryStat: {
    alignItems: 'center',
    gap: 2,
  },
  secondaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  secondaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
