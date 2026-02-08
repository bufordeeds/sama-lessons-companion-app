import React from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

type BadgeVariant = 'passed' | 'mastered' | 'broke' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  passed: { bg: colors.successDim, text: colors.success },
  mastered: { bg: '#4A3D00', text: colors.mastered },
  broke: { bg: colors.dangerDim, text: colors.danger },
  default: { bg: colors.surfaceLight, text: colors.textSecondary },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <RNView style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
