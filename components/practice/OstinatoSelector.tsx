import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/Themed';
import { getOstinatosForCurriculum, type Ostinato } from '@/constants/curriculum';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface OstinatoSelectorProps {
  selectedOstinato: Ostinato;
  onSelect: (ostinato: Ostinato) => void;
  ostinatoStatuses: Map<Ostinato, { passed: boolean; attemptCount: number }>;
  curriculumItemId?: string;
}

export function OstinatoSelector({
  selectedOstinato,
  onSelect,
  ostinatoStatuses,
  curriculumItemId,
}: OstinatoSelectorProps) {
  const ostinatos = getOstinatosForCurriculum(curriculumItemId ?? '');
  const aRow = ostinatos.filter((o) => o.endsWith('A'));
  const bRow = ostinatos.filter((o) => o.endsWith('B'));
  const plainRow = ostinatos.filter((o) => !o.endsWith('A') && !o.endsWith('B'));

  if (ostinatos.length === 0) return null;

  return (
    <RNView style={styles.container}>
      {plainRow.length > 0 && (
        <RNView style={styles.row}>
          {plainRow.map((ost) => (
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
      )}
      {aRow.length > 0 && (
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
      )}
      {bRow.length > 0 && (
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
      )}
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
      {passed && <Ionicons name="checkmark" size={14} color={colors.success} style={styles.checkmark} />}
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
    marginTop: 2,
  },
});
