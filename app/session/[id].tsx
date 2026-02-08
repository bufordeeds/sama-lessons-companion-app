import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Text, View } from '@/components/Themed';
import dayjs from 'dayjs';
import {
  getSessionSegments,
  getSessionAttemptsGrouped,
  getSessionCurriculumItemId,
  getCurriculumItems,
} from '@/db/queries';
import { SessionDetail } from '@/components/history/SessionDetail';
import type { AttemptRow, SessionSegmentRow, CurriculumItemRow } from '@/types';
import { colors, spacing, fontSize } from '@/constants/theme';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [segments, setSegments] = useState<SessionSegmentRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [curriculumName, setCurriculumName] = useState('Practice');
  const [startedAt, setStartedAt] = useState('');

  useEffect(() => {
    if (!id) return;

    const segs = getSessionSegments(id);
    setSegments(segs);
    if (segs.length > 0) {
      setStartedAt(segs[0].started_at);
    }

    setAttempts(getSessionAttemptsGrouped(id));

    const curriculumId = getSessionCurriculumItemId(id);
    if (curriculumId) {
      const items = getCurriculumItems();
      const item = items.find((i) => i.id === curriculumId);
      if (item) setCurriculumName(item.name);
    }
  }, [id]);

  if (!startedAt) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const title = `${dayjs(startedAt).format('MMM D')} — ${curriculumName}`;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SessionDetail
        startedAt={startedAt}
        curriculumItemName={curriculumName}
        segments={segments}
        attempts={attempts}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
