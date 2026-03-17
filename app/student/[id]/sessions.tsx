import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Pressable, View as RNView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Text, View } from '@/components/Themed';
import dayjs from 'dayjs';
import { apiFetch } from '@/lib/api';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface SessionSummary {
  id: string;
  started_at: string;
  ended_at: string | null;
  curriculum_item_name: string | null;
  notes: string | null;
  video_url: string | null;
  segment_count: number;
  attempt_count: number;
  avg_mistakes: number;
  min_tempo: number | null;
  max_tempo: number | null;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function StudentSessionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('Sessions');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiFetch<{ sessions: SessionSummary[] }>(
          `/teacher/students/${id}/sessions`,
        );
        setSessions(data.sessions);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }

      try {
        const { students } = await apiFetch<{ students: { id: string; name: string }[] }>(
          '/teacher/students',
        );
        const student = students.find((s) => s.id === id);
        if (student?.name) setStudentName(`${student.name}'s Sessions`);
      } catch { /* ignore */ }
    })();
  }, [id]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: studentName }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </>
    );
  }

  if (sessions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: studentName }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Sessions</Text>
          <Text style={styles.emptyText}>This student hasn't logged any sessions yet.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: studentName }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = dayjs(item.started_at).format('MMM D, YYYY');
          const tempoRange =
            item.min_tempo && item.max_tempo
              ? item.min_tempo === item.max_tempo
                ? `${item.min_tempo} BPM`
                : `${item.min_tempo}–${item.max_tempo} BPM`
              : null;

          return (
            <RNView style={styles.card}>
              <RNView style={styles.header}>
                <Text style={styles.date}>{date}</Text>
                {item.curriculum_item_name && (
                  <Text style={styles.curriculum}>{item.curriculum_item_name}</Text>
                )}
              </RNView>

              <Text style={styles.detail}>
                {item.segment_count} segment{item.segment_count !== 1 ? 's' : ''} ·{' '}
                {formatDuration(item.started_at, item.ended_at)}
              </Text>

              {item.attempt_count > 0 && (
                <>
                  <Text style={styles.detail}>
                    {item.attempt_count} attempt{item.attempt_count !== 1 ? 's' : ''} · Avg{' '}
                    {item.avg_mistakes} mistakes
                  </Text>
                  {tempoRange && <Text style={styles.detail}>Tempo: {tempoRange}</Text>}
                </>
              )}

              {item.notes && (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
            </RNView>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
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
  notes: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
