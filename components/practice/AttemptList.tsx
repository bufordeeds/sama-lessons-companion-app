import React from 'react';
import { StyleSheet, FlatList, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import type { AttemptRow } from '@/types';
import type { Ostinato } from '@/constants/curriculum';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface AttemptListProps {
  attempts: AttemptRow[];
  selectedOstinato: Ostinato;
  onDelete: (attemptId: string) => void;
}

export function AttemptList({
  attempts,
  selectedOstinato,
  onDelete,
}: AttemptListProps) {
  const filtered = attempts.filter((a) => a.ostinato === selectedOstinato);

  if (filtered.length === 0) {
    return (
      <RNView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No attempts for {selectedOstinato} yet</Text>
      </RNView>
    );
  }

  return (
    <RNView style={styles.container}>
      <Text style={styles.header}>Attempts for {selectedOstinato}</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          const passed = item.mistakes <= 3 && item.ostinato_broke === 0;
          const broke = item.ostinato_broke === 1;

          return (
            <RNView style={styles.row}>
              <RNView style={styles.rowContent}>
                <Text style={styles.attemptNum}>#{index + 1}</Text>
                <Text style={styles.mistakes}>
                  {item.mistakes} mistake{item.mistakes !== 1 ? 's' : ''}
                </Text>
                {passed && (
                  <RNView style={styles.passedBadge}>
                    <Text style={styles.passedText}>✓ Passed</Text>
                  </RNView>
                )}
                {broke && (
                  <RNView style={styles.brokeBadge}>
                    <Text style={styles.brokeText}>Broke</Text>
                  </RNView>
                )}
              </RNView>
              <Pressable
                style={styles.deleteButton}
                onPress={() => onDelete(item.id)}
                hitSlop={8}
              >
                <Text style={styles.deleteText}>✕</Text>
              </Pressable>
            </RNView>
          );
        }}
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  header: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  attemptNum: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 30,
  },
  mistakes: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  passedBadge: {
    backgroundColor: colors.successDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  passedText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '600',
  },
  brokeBadge: {
    backgroundColor: colors.dangerDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  brokeText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
