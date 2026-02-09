import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { getOstinatosForCurriculum, type Ostinato } from '@/constants/curriculum';
import type { MasteryStatus } from '@/types';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface MasteryGridProps {
  grid: Map<Ostinato, { status: MasteryStatus; attemptCount: number }>;
  curriculumItemId: string;
}

const STATUS_COLORS: Record<MasteryStatus, { bg: string; border: string; text: string; countText: string }> = {
  not_started: {
    bg: colors.surface,
    border: colors.border,
    text: colors.textMuted,
    countText: colors.textMuted,
  },
  in_progress: {
    bg: colors.surfaceLight,
    border: colors.border,
    text: colors.textSecondary,
    countText: colors.textMuted,
  },
  passed: {
    bg: '#1B5E20',          // deep green — high contrast base
    border: colors.success,
    text: '#E8F5E9',        // very light green text
    countText: '#A5D6A7',   // medium green for secondary
  },
  mastered: {
    bg: '#5C4A1E',          // deep gold
    border: colors.primary,
    text: '#FFF8E1',        // cream text
    countText: '#D4A843',   // gold for secondary
  },
};

const LEGEND: { status: MasteryStatus; label: string; icon: string }[] = [
  { status: 'not_started', label: 'Not Started', icon: '' },
  { status: 'in_progress', label: 'In Progress', icon: '' },
  { status: 'passed', label: 'Passed', icon: '✓' },
  { status: 'mastered', label: 'Mastered', icon: '★' },
];

export function MasteryGrid({ grid, curriculumItemId }: MasteryGridProps) {
  const ostinatos = getOstinatosForCurriculum(curriculumItemId);
  const aRow = ostinatos.filter((o) => o.endsWith('A'));
  const bRow = ostinatos.filter((o) => o.endsWith('B'));
  const plainRow = ostinatos.filter((o) => !o.endsWith('A') && !o.endsWith('B'));

  if (ostinatos.length === 0) {
    return (
      <View style={styles.grid}>
        <Text style={styles.noOstinatos}>No ostinatos for this curriculum item</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {plainRow.length > 0 && (
        <View style={styles.row}>
          {plainRow.map((ost) => (
            <MasteryCell key={ost} ostinato={ost} data={grid.get(ost)} />
          ))}
        </View>
      )}
      {aRow.length > 0 && (
        <View style={styles.row}>
          {aRow.map((ost) => (
            <MasteryCell key={ost} ostinato={ost} data={grid.get(ost)} />
          ))}
        </View>
      )}
      {bRow.length > 0 && (
        <View style={styles.row}>
          {bRow.map((ost) => (
            <MasteryCell key={ost} ostinato={ost} data={grid.get(ost)} />
          ))}
        </View>
      )}
      <View style={styles.legend}>
        {LEGEND.map((item) => {
          const palette = STATUS_COLORS[item.status];
          return (
            <View key={item.status} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                {item.icon ? (
                  <Text style={{ fontSize: 8, color: palette.text }}>{item.icon}</Text>
                ) : null}
              </View>
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MasteryCell({
  ostinato,
  data,
}: {
  ostinato: Ostinato;
  data?: { status: MasteryStatus; attemptCount: number };
}) {
  const status = data?.status ?? 'not_started';
  const count = data?.attemptCount ?? 0;
  const palette = STATUS_COLORS[status];

  return (
    <View
      style={[
        styles.cell,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{ostinato}</Text>
      {count > 0 && (
        <Text style={[styles.count, { color: palette.countText }]}>
          {count} att
        </Text>
      )}
      {status === 'passed' && (
        <Text style={[styles.statusIcon, { color: '#A5D6A7' }]}>✓</Text>
      )}
      {status === 'mastered' && (
        <Text style={[styles.statusIcon, { color: colors.primary }]}>★</Text>
      )}
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
  },
  count: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  statusIcon: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: fontSize.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  noOstinatos: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
