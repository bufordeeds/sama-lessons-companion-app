import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize } from '@/constants/theme';

interface StatItem {
  label: string;
  value: string | number;
}

interface StatsRowProps {
  items: StatItem[];
}

export function StatsRow({ items }: StatsRowProps) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
