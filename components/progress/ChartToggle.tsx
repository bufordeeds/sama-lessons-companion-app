import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface ChartToggleProps {
  selected: 'overview' | 'by-ostinato';
  onSelect: (mode: 'overview' | 'by-ostinato') => void;
}

export function ChartToggle({ selected, onSelect }: ChartToggleProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.segment, selected === 'overview' && styles.segmentActive]}
        onPress={() => onSelect('overview')}
      >
        <Text
          style={[styles.label, selected === 'overview' && styles.labelActive]}
        >
          Overview
        </Text>
      </Pressable>
      <Pressable
        style={[styles.segment, selected === 'by-ostinato' && styles.segmentActive]}
        onPress={() => onSelect('by-ostinato')}
      >
        <Text
          style={[
            styles.label,
            selected === 'by-ostinato' && styles.labelActive,
          ]}
        >
          By Ostinato
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentActive: {
    backgroundColor: colors.surfaceLight,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.text,
  },
});
