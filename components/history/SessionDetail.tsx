import React from 'react';
import { StyleSheet, ScrollView, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import dayjs from 'dayjs';
import { OSTINATOS, type Ostinato } from '@/constants/curriculum';
import type { AttemptRow, SessionSegmentRow } from '@/types';
import { Badge } from '@/components/shared/Badge';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface SessionDetailProps {
  startedAt: string;
  curriculumItemName: string;
  segments: SessionSegmentRow[];
  attempts: AttemptRow[];
}

function formatSegmentDuration(segment: SessionSegmentRow): string {
  if (!segment.ended_at) return '';
  const start = new Date(segment.started_at).getTime();
  const end = new Date(segment.ended_at).getTime();
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SessionDetail({
  startedAt,
  curriculumItemName,
  segments,
  attempts,
}: SessionDetailProps) {
  const date = dayjs(startedAt).format('MMM D, YYYY');

  // Group attempts by segment and ostinato
  const attemptsBySegment = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const existing = attemptsBySegment.get(a.session_segment_id) ?? [];
    existing.push(a);
    attemptsBySegment.set(a.session_segment_id, existing);
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      <RNView style={styles.header}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.curriculum}>{curriculumItemName}</Text>
      </RNView>

      {segments.map((segment) => {
        const segAttempts = attemptsBySegment.get(segment.id) ?? [];

        // Group by ostinato
        const byOstinato = new Map<Ostinato, AttemptRow[]>();
        for (const a of segAttempts) {
          const existing = byOstinato.get(a.ostinato) ?? [];
          existing.push(a);
          byOstinato.set(a.ostinato, existing);
        }

        const duration = formatSegmentDuration(segment);

        return (
          <RNView key={segment.id} style={styles.segmentBlock}>
            <Text style={styles.segmentTitle}>
              Segment {segment.segment_number}
              {duration ? ` (${duration})` : ''}
            </Text>

            {OSTINATOS.map((ost) => {
              const ostAttempts = byOstinato.get(ost);
              if (!ostAttempts || ostAttempts.length === 0) return null;

              const hasPassing = ostAttempts.some(
                (a) => a.mistakes <= 3 && a.ostinato_broke === 0,
              );

              return (
                <RNView key={ost} style={styles.ostinatoRow}>
                  <Text style={styles.ostinatoLabel}>{ost}</Text>
                  <Text style={styles.tempoText}>
                    {ostAttempts[0].tempo} BPM
                  </Text>
                  <RNView style={styles.attemptsContainer}>
                    {ostAttempts.map((a, i) => {
                      const passed =
                        a.mistakes <= 3 && a.ostinato_broke === 0;
                      const broke = a.ostinato_broke === 1;
                      const isLast = i === ostAttempts.length - 1;

                      return (
                        <RNView key={a.id} style={styles.attemptInline}>
                          <Text
                            style={[
                              styles.mistakeNum,
                              passed && styles.mistakeNumPassed,
                            ]}
                          >
                            {a.mistakes}
                            {!isLast ? ',' : ''}
                          </Text>
                          {passed && (
                            <Text style={styles.passedCheck}> ✓</Text>
                          )}
                          {broke && (
                            <Badge label="broke" variant="broke" />
                          )}
                        </RNView>
                      );
                    })}
                  </RNView>
                </RNView>
              );
            })}
          </RNView>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.xs,
  },
  date: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  curriculum: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  segmentBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  segmentTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ostinatoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ostinatoLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 36,
  },
  tempoText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 70,
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 2,
  },
  attemptInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mistakeNum: {
    fontSize: fontSize.md,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  mistakeNumPassed: {
    fontWeight: '700',
    color: colors.success,
  },
  passedCheck: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
});
