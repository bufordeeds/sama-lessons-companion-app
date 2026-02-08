import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, Alert, View as RNView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import dayjs from 'dayjs';
import {
  getSessionSegments,
  getSessionAttemptsGrouped,
  getSessionCurriculumItemId,
  getCurriculumItems,
  deleteSession,
  deleteSegment,
} from '@/db/queries';
import { useSessionStore } from '@/stores/sessionStore';
import { SessionDetail } from '@/components/history/SessionDetail';
import type { AttemptRow, SessionSegmentRow } from '@/types';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activeSession = useSessionStore((s) => s.activeSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);

  const [segments, setSegments] = useState<SessionSegmentRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [curriculumName, setCurriculumName] = useState('Practice');
  const [startedAt, setStartedAt] = useState('');

  const loadData = useCallback(() => {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSegment = useCallback((segmentId: string) => {
    deleteSegment(segmentId);
    loadData();
  }, [loadData]);

  const handleContinue = () => {
    if (!id) return;
    resumeSession(id);
    router.replace('/(tabs)');
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete Session',
      'This will permanently delete this session and all its attempts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSession(id);
            router.back();
          },
        },
      ],
    );
  };

  if (!startedAt) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const title = `${dayjs(startedAt).format('MMM D')} — ${curriculumName}`;
  const canContinue = !activeSession;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SessionDetail
        startedAt={startedAt}
        curriculumItemName={curriculumName}
        segments={segments}
        attempts={attempts}
        onDeleteSegment={handleDeleteSegment}
      />
      <RNView style={styles.actionBar}>
        {canContinue && (
          <Pressable style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue Session</Text>
          </Pressable>
        )}
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Session</Text>
        </Pressable>
      </RNView>
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
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    flex: 1,
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  continueButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.background,
  },
  deleteButton: {
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerDim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deleteButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.danger,
  },
});
