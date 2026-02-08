import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '@/components/Themed';
import { DashboardSection } from '@/components/progress/DashboardSection';
import { StatsRow } from '@/components/progress/StatsRow';
import { CurriculumPicker } from '@/components/progress/CurriculumPicker';
import { MasteryGrid } from '@/components/progress/MasteryGrid';
import { StreakCard } from '@/components/progress/StreakCard';
import { PracticeCalendar } from '@/components/progress/PracticeCalendar';
import { TempoChart } from '@/components/progress/TempoChart';
import {
  getCurriculumProgress,
  getOverallStats,
  getMasteryGrid,
  getStreakStats,
  getPracticeDays,
  getAggregateTempoHistory,
  getTempoHistory,
} from '@/db/queries';
import type { Ostinato } from '@/constants/curriculum';
import type { MasteryStatus } from '@/types';
import { colors, spacing, fontSize } from '@/constants/theme';

export default function ProgressScreen() {
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [curriculumItems, setCurriculumItems] = useState<
    { id: string; name: string; attemptCount: number; ostinatosPassed: number }[]
  >([]);
  const [overallStats, setOverallStats] = useState({
    totalSessions: 0,
    totalAttempts: 0,
    totalPracticeMinutes: 0,
    avgMistakes: 0,
  });
  const [masteryGrid, setMasteryGrid] = useState<
    Map<Ostinato, { status: MasteryStatus; attemptCount: number }>
  >(new Map());
  const [streakStats, setStreakStats] = useState({ current: 0, longest: 0, totalDays: 0 });
  const [practiceDays, setPracticeDays] = useState<string[]>([]);
  const [aggregateTempoData, setAggregateTempoData] = useState<
    { date: string; avgTempo: number; minTempo: number; maxTempo: number }[]
  >([]);
  const [ostinatoTempoData, setOstinatoTempoData] = useState<
    { ostinato: Ostinato; tempo: number; date: string; passed: boolean }[]
  >([]);

  const loadData = useCallback(() => {
    const items = getCurriculumProgress();
    setCurriculumItems(items);

    let currId = selectedCurriculumId;
    if (items.length > 0 && !items.find((i) => i.id === currId)) {
      const firstWithData = items.find((i) => i.attemptCount > 0);
      currId = firstWithData?.id ?? items[0].id;
      setSelectedCurriculumId(currId);
    }

    setOverallStats(getOverallStats());
    if (currId) {
      setMasteryGrid(getMasteryGrid(currId));
      setAggregateTempoData(getAggregateTempoHistory(currId));
      setOstinatoTempoData(getTempoHistory(currId));
    }
    setStreakStats(getStreakStats());
    setPracticeDays(getPracticeDays());
  }, [selectedCurriculumId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSelectCurriculum = useCallback(
    (id: string) => {
      setSelectedCurriculumId(id);
      setMasteryGrid(getMasteryGrid(id));
      setAggregateTempoData(getAggregateTempoHistory(id));
      setOstinatoTempoData(getTempoHistory(id));
    },
    [],
  );

  if (curriculumItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Progress Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start practicing to see your progress!
        </Text>
      </View>
    );
  }

  const hasData = overallStats.totalAttempts > 0;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <CurriculumPicker
        items={curriculumItems}
        selectedId={selectedCurriculumId}
        onSelect={handleSelectCurriculum}
      />

      {hasData && (
        <DashboardSection
          title="Overview"
          info="Your overall practice stats across all sessions and curriculum items. Sessions counts completed practice sessions, Attempts is total logged attempts, Practice is total time, and Avg Mistakes is your average mistakes per attempt."
        >
          <StatsRow
            items={[
              { label: 'Sessions', value: overallStats.totalSessions },
              { label: 'Attempts', value: overallStats.totalAttempts },
              {
                label: 'Practice',
                value: overallStats.totalPracticeMinutes >= 60
                  ? `${Math.floor(overallStats.totalPracticeMinutes / 60)}h ${overallStats.totalPracticeMinutes % 60}m`
                  : `${overallStats.totalPracticeMinutes}m`,
              },
              { label: 'Avg Mistakes', value: overallStats.avgMistakes },
            ]}
          />
        </DashboardSection>
      )}

      <DashboardSection
        title="Mastery"
        info={"Each ostinato progresses through four levels:\n\n" +
          "Not Started — No attempts yet\n" +
          "In Progress — Practicing but not yet passed\n" +
          "Passed ✓ — At least one attempt with 3 or fewer mistakes and the ostinato didn't break\n" +
          "Mastered ★ — Last 10 attempts average 1 or fewer mistakes with no breaks\n\n" +
          "Pass all 8 ostinatos, then work toward mastering them!"}
      >
        <MasteryGrid grid={masteryGrid} />
      </DashboardSection>

      <DashboardSection
        title="Streak"
        info="Practice consistently to build your streak! A streak counts consecutive days where you logged at least one practice session. Even a short session keeps the streak alive."
      >
        <StreakCard
          current={streakStats.current}
          longest={streakStats.longest}
          totalDays={streakStats.totalDays}
        />
        <PracticeCalendar practiceDays={practiceDays} />
      </DashboardSection>

      <DashboardSection
        title="Tempo Progression"
        info="Track how your tempo changes over time. Overview shows your average tempo per session with a range band. By Ostinato shows individual tempo lines for each ostinato pattern. Increasing tempo while keeping mistakes low is the goal!"
      >
        <TempoChart
          aggregateData={aggregateTempoData}
          ostinatoData={ostinatoTempoData}
        />
      </DashboardSection>
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
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
