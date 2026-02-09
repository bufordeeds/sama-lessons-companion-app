import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSessions } from '@/db/queries';
import { SessionCard } from '@/components/history/SessionCard';
import { colors, spacing, fontSize } from '@/constants/theme';

type SessionRow = ReturnType<typeof getAllSessions>[number];

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      setSessions(getAllSessions());
    }, []),
  );

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sessions yet</Text>
        <Text style={styles.emptySubtext}>
          Complete a practice session to see it here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SessionCard
          id={item.id}
          startedAt={item.started_at}
          curriculumItemId={item.curriculum_item_id ?? ''}
          curriculumItemName={item.curriculum_item_name ?? 'Practice'}
          segmentCount={item.segment_count}
          durationMinutes={item.duration_minutes}
          totalAttempts={item.total_attempts}
          avgMistakes={item.avg_mistakes}
          minTempo={item.min_tempo}
          maxTempo={item.max_tempo}
          ostinatosPassed={item.ostinatos_passed}
          onPress={() => router.push(`/session/${item.id}` as any)}
        />
      )}
    />
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
  emptyText: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
