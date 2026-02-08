import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { OSTINATOS, type Ostinato } from '@/constants/curriculum';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface OstinatoSelectorProps {
  selectedOstinato: Ostinato;
  onSelect: (ostinato: Ostinato) => void;
  ostinatoStatuses: Map<Ostinato, { passed: boolean; attemptCount: number }>;
}

export function OstinatoSelector({
  selectedOstinato,
  onSelect,
  ostinatoStatuses,
}: OstinatoSelectorProps) {
  const aRow = OSTINATOS.filter((o) => o.endsWith('A'));
  const bRow = OSTINATOS.filter((o) => o.endsWith('B'));

  return (
    <RNView style={styles.container}>
      <RNView style={styles.row}>
        {aRow.map((ost) => (
          <OstinatoCell
            key={ost}
            ostinato={ost}
            isSelected={selectedOstinato === ost}
            status={ostinatoStatuses.get(ost)}
            onPress={() => onSelect(ost)}
            variant="A"
          />
        ))}
      </RNView>
      <RNView style={styles.row}>
        {bRow.map((ost) => (
          <OstinatoCell
            key={ost}
            ostinato={ost}
            isSelected={selectedOstinato === ost}
            status={ostinatoStatuses.get(ost)}
            onPress={() => onSelect(ost)}
            variant="B"
          />
        ))}
      </RNView>
    </RNView>
  );
}

function OstinatoCell({
  ostinato,
  isSelected,
  status,
  onPress,
  variant,
}: {
  ostinato: Ostinato;
  isSelected: boolean;
  status?: { passed: boolean; attemptCount: number };
  onPress: () => void;
  variant: 'A' | 'B';
}) {
  const passed = status?.passed ?? false;

  return (
    <Pressable
      style={[
        styles.cell,
        { backgroundColor: variant === 'A' ? colors.ostinatoA : colors.ostinatoB },
        isSelected && styles.cellSelected,
        passed && styles.cellPassed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>
        {ostinato}
      </Text>
      {passed && <Text style={styles.checkmark}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    minHeight: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  cellSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cellPassed: {
    borderColor: colors.successDim,
  },
  cellText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cellTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginTop: 2,
  },
});
