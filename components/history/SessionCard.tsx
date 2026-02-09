import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import dayjs from 'dayjs';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface SessionCardProps {
  id: string;
  startedAt: string;
  curriculumItemName: string;
  segmentCount: number;
  durationMinutes: number;
  totalAttempts: number;
  avgMistakes: number;
  minTempo: number;
  maxTempo: number;
  ostinatosPassed: number;
  onPress: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SessionCard({
  startedAt,
  curriculumItemName,
  segmentCount,
  durationMinutes,
  totalAttempts,
  avgMistakes,
  minTempo,
  maxTempo,
  ostinatosPassed,
  onPress,
}: SessionCardProps) {
  const date = dayjs(startedAt).format('MMM D, YYYY');
  const tempoRange =
    minTempo === maxTempo ? `${minTempo} BPM` : `${minTempo}–${maxTempo} BPM`;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <RNView style={styles.header}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.curriculum}>{curriculumItemName}</Text>
      </RNView>

      <Text style={styles.detail}>
        {segmentCount} segment{segmentCount !== 1 ? 's' : ''} ·{' '}
        {formatDuration(durationMinutes)}
      </Text>

      {totalAttempts > 0 ? (
        <>
          <Text style={styles.detail}>
            {totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''} · Avg{' '}
            {avgMistakes} mistakes
          </Text>
          <Text style={styles.detail}>Tempo: {tempoRange}</Text>

          <RNView style={styles.progressContainer}>
            <RNView style={styles.progressTrack}>
              <RNView
                style={[
                  styles.progressFill,
                  { width: `${(ostinatosPassed / 8) * 100}%` },
                ]}
              />
            </RNView>
            <Text style={styles.progressLabel}>
              {ostinatosPassed}/8 ostinatos passed
            </Text>
          </RNView>
        </>
      ) : (
        <Text style={styles.notesOnly}>Notes & video only</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  curriculum: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  notesOnly: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
