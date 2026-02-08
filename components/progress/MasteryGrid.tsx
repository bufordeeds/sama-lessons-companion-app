import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { OSTINATOS, type Ostinato } from '@/constants/curriculum';
import type { MasteryStatus } from '@/types';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface MasteryGridProps {
  grid: Map<Ostinato, { status: MasteryStatus; attemptCount: number }>;
}

const STATUS_COLORS: Record<MasteryStatus, string> = {
  not_started: colors.surface,
  in_progress: colors.surfaceLight,
  passed: colors.successDim,
  mastered: colors.primaryDim,
};

const STATUS_BORDER: Record<MasteryStatus, string> = {
  not_started: colors.border,
  in_progress: colors.border,
  passed: colors.success,
  mastered: colors.primary,
};

export function MasteryGrid({ grid }: MasteryGridProps) {
  const aOstinatos = OSTINATOS.filter((o) => o.endsWith('A'));
  const bOstinatos = OSTINATOS.filter((o) => o.endsWith('B'));

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        {aOstinatos.map((ost) => (
          <MasteryCell
            key={ost}
            ostinato={ost}
            data={grid.get(ost)}
            variant="A"
          />
        ))}
      </View>
      <View style={styles.row}>
        {bOstinatos.map((ost) => (
          <MasteryCell
            key={ost}
            ostinato={ost}
            data={grid.get(ost)}
            variant="B"
          />
        ))}
      </View>
    </View>
  );
}

function MasteryCell({
  ostinato,
  data,
  variant,
}: {
  ostinato: Ostinato;
  data?: { status: MasteryStatus; attemptCount: number };
  variant: 'A' | 'B';
}) {
  const status = data?.status ?? 'not_started';
  const count = data?.attemptCount ?? 0;
  const bgColor = STATUS_COLORS[status];
  const borderColor = STATUS_BORDER[status];
  const tint = variant === 'A' ? colors.ostinatoA : colors.ostinatoB;

  return (
    <View
      style={[
        styles.cell,
        {
          backgroundColor: status === 'not_started' ? tint : bgColor,
          borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          status === 'mastered' && styles.labelMastered,
          status === 'passed' && styles.labelPassed,
        ]}
      >
        {ostinato}
      </Text>
      {count > 0 && (
        <Text style={styles.count}>
          {count} {count === 1 ? 'att' : 'att'}
        </Text>
      )}
      {status === 'passed' && <Text style={styles.statusIcon}>✓</Text>}
      {status === 'mastered' && <Text style={styles.statusIcon}>★</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  labelPassed: {
    color: colors.success,
  },
  labelMastered: {
    color: colors.primary,
  },
  count: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  statusIcon: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: fontSize.xs,
    color: colors.success,
  },
});
