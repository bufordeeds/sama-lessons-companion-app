import React from 'react';
import { StyleSheet, ScrollView, Pressable, View } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface CurriculumOption {
  id: string;
  name: string;
  attemptCount: number;
  ostinatosPassed: number;
}

interface CurriculumPickerProps {
  items: CurriculumOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CurriculumPicker({ items, selectedId, onSelect }: CurriculumPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {item.name}
            </Text>
            {item.attemptCount > 0 && (
              <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                <Text style={styles.badgeText}>{item.ostinatosPassed}/8</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
