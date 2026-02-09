import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { SHEET_MUSIC } from '@/constants/sheetMusic';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

export function SheetMusicLibrary() {
  const router = useRouter();

  return (
    <RNView style={styles.container}>
      <Text style={styles.sectionLabel}>Sheet Music</Text>
      {SHEET_MUSIC.map((sheet) => (
        <Pressable
          key={sheet.id}
          style={styles.row}
          onPress={() => router.push(`/sheet-music/${sheet.id}` as any)}
        >
          <RNView style={styles.rowLeft}>
            <Text style={styles.rowName}>{sheet.name}</Text>
            {sheet.curriculumItemId === null && (
              <Text style={styles.referenceTag}>Reference</Text>
            )}
          </RNView>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  referenceTag: {
    fontSize: fontSize.xs,
    color: colors.primary,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  arrow: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
});
