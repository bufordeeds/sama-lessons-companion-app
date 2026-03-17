import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, Pressable, View as RNView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { DashboardSection } from '@/components/progress/DashboardSection';
import { StatsRow } from '@/components/progress/StatsRow';
import { CurriculumPicker } from '@/components/progress/CurriculumPicker';
import { MasteryGrid } from '@/components/progress/MasteryGrid';
import { StreakCard } from '@/components/progress/StreakCard';
import { PracticeCalendar } from '@/components/progress/PracticeCalendar';
import { TempoChart } from '@/components/progress/TempoChart';
import { apiFetch } from '@/lib/api';
import type { Ostinato } from '@/constants/curriculum';
import type { MasteryStatus } from '@/types';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface ProgressData {
  stats: {
    totalSessions: number;
    totalAttempts: number;
    totalPracticeMinutes: number;
    avgMistakes: number;
  };
  curriculumProgress: {
    id: string;
    name: string;
    attemptCount: number;
    ostinatosPassed: number;
    lastPracticed: string | null;
  }[];
  streaks: { current: number; longest: number; totalDays: number };
  practiceDays: string[];
}

export default function StudentProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [masteryGrid, setMasteryGrid] = useState<
    Map<Ostinato, { status: MasteryStatus; attemptCount: number }>
  >(new Map());
  const [aggregateTempoData, setAggregateTempoData] = useState<
    { date: string; avgTempo: number; minTempo: number; maxTempo: number }[]
  >([]);
  const [ostinatoTempoData, setOstinatoTempoData] = useState<
    { ostinato: Ostinato; tempo: number; date: string; passed: boolean }[]
  >([]);
  const [studentName, setStudentName] = useState('Student');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const progress = await apiFetch<ProgressData>(`/teacher/students/${id}/progress`);
        setData(progress);

        // Select first curriculum item with data
        if (progress.curriculumProgress.length > 0) {
          const firstWithData = progress.curriculumProgress.find((i) => i.attemptCount > 0);
          const currId = firstWithData?.id ?? progress.curriculumProgress[0].id;
          setSelectedCurriculumId(currId);
          await loadMasteryAndTempo(currId);
        }
      } catch (err) {
        console.error('Failed to load student progress:', err);
      }

      // Get student name from the students list
      try {
        const { students } = await apiFetch<{ students: { id: string; name: string }[] }>('/teacher/students');
        const student = students.find((s) => s.id === id);
        if (student?.name) setStudentName(student.name);
      } catch { /* ignore */ }
    })();
  }, [id]);

  const loadMasteryAndTempo = useCallback(async (currId: string) => {
    if (!id) return;
    try {
      const [mastery, tempo] = await Promise.all([
        apiFetch<{ grid: Record<string, { status: MasteryStatus; attemptCount: number }> }>(
          `/teacher/students/${id}/mastery/${currId}`,
        ),
        apiFetch<{
          aggregateData: { date: string; avgTempo: number; minTempo: number; maxTempo: number }[];
          ostinatoData: { ostinato: Ostinato; tempo: number; date: string; passed: boolean }[];
        }>(`/teacher/students/${id}/tempo/${currId}`),
      ]);

      const map = new Map<Ostinato, { status: MasteryStatus; attemptCount: number }>();
      for (const [key, val] of Object.entries(mastery.grid)) {
        map.set(key as Ostinato, val);
      }
      setMasteryGrid(map);
      setAggregateTempoData(tempo.aggregateData);
      setOstinatoTempoData(tempo.ostinatoData);
    } catch (err) {
      console.error('Failed to load mastery/tempo:', err);
    }
  }, [id]);

  const handleSelectCurriculum = useCallback(async (currId: string) => {
    setSelectedCurriculumId(currId);
    await loadMasteryAndTempo(currId);
  }, [loadMasteryAndTempo]);

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: studentName }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </>
    );
  }

  const hasData = data.stats.totalAttempts > 0;

  return (
    <>
      <Stack.Screen options={{ title: studentName }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Pressable
          style={styles.sessionsButton}
          onPress={() => router.push(`/student/${id}/sessions` as any)}
        >
          <Text style={styles.sessionsButtonText}>View Sessions</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <CurriculumPicker
          items={data.curriculumProgress}
          selectedId={selectedCurriculumId}
          onSelect={handleSelectCurriculum}
        />

        {hasData && (
          <DashboardSection title="Overview">
            <StatsRow
              items={[
                { label: 'Sessions', value: data.stats.totalSessions },
                { label: 'Attempts', value: data.stats.totalAttempts },
                {
                  label: 'Practice',
                  value: data.stats.totalPracticeMinutes >= 60
                    ? `${Math.floor(data.stats.totalPracticeMinutes / 60)}h ${data.stats.totalPracticeMinutes % 60}m`
                    : `${data.stats.totalPracticeMinutes}m`,
                },
                { label: 'Avg Mistakes', value: data.stats.avgMistakes },
              ]}
            />
          </DashboardSection>
        )}

        <DashboardSection title="Mastery">
          <MasteryGrid grid={masteryGrid} curriculumItemId={selectedCurriculumId} />
        </DashboardSection>

        <DashboardSection title="Streak">
          <StreakCard
            current={data.streaks.current}
            longest={data.streaks.longest}
            totalDays={data.streaks.totalDays}
          />
          <PracticeCalendar practiceDays={data.practiceDays} />
        </DashboardSection>

        <DashboardSection title="Tempo Progression">
          <TempoChart
            aggregateData={aggregateTempoData}
            ostinatoData={ostinatoTempoData}
          />
        </DashboardSection>
      </ScrollView>
    </>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  sessionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    minHeight: touchTarget.min,
  },
  sessionsButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  arrow: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
});
