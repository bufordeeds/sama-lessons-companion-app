import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Pressable,
  ScrollView,
  View as RNView,
  useWindowDimensions,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/stores/sessionStore';
import {
  getCurriculumItems,
  getOstinatoStatusesForSegment,
  getSegmentSummary,
  getPreference,
} from '@/db/queries';
import { OstinatoSelector } from '@/components/practice/OstinatoSelector';
import { AttemptLogger } from '@/components/practice/AttemptLogger';
import { AttemptList } from '@/components/practice/AttemptList';
import { SessionTimer } from '@/components/practice/SessionTimer';
import { UndoBanner } from '@/components/practice/UndoBanner';
import { SheetMusicLibrary } from '@/components/practice/SheetMusicLibrary';
import { getSheetForCurriculum } from '@/constants/sheetMusic';
import type { CurriculumItemRow } from '@/types';
import type { Ostinato } from '@/constants/curriculum';
import { LESSON_QUOTES, getQuoteOfTheDay } from '@/constants/quotes';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

export default function PracticeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width > 768;

  const activeSession = useSessionStore((s) => s.activeSession);
  const currentSegmentAttempts = useSessionStore((s) => s.currentSegmentAttempts);
  const betweenSegments = useSessionStore((s) => s.betweenSegments);
  const lastEndedSegmentId = useSessionStore((s) => s.lastEndedSegmentId);
  const lastLoggedAttemptId = useSessionStore((s) => s.lastLoggedAttemptId);
  const {
    startSession,
    endSession,
    selectOstinato,
    adjustTempo,
    setTempo,
    incrementMistakes,
    decrementMistakes,
    toggleOstinatoBroke,
    logAttempt,
    deleteAttempt,
    undoLastAttempt,
    endCurrentSegment,
    startNewSegment,
  } = useSessionStore();

  const [curriculumItems, setCurriculumItems] = useState<CurriculumItemRow[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [initialTempo, setInitialTempo] = useState<number>(100);
  const [quoteIndex, setQuoteIndex] = useState(() => {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return dayIndex % LESSON_QUOTES.length;
  });
  const quote = LESSON_QUOTES[quoteIndex % LESSON_QUOTES.length];

  // Load curriculum items and saved preferences
  useEffect(() => {
    const items = getCurriculumItems();
    setCurriculumItems(items);

    const savedItemId = getPreference('lastCurriculumItemId');
    const savedTempo = getPreference('lastTempo');

    if (savedItemId && items.some((i) => i.id === savedItemId)) {
      setSelectedItemId(savedItemId);
    } else if (items.length > 0) {
      setSelectedItemId(items[0].id);
    }

    if (savedTempo) {
      const parsed = parseInt(savedTempo, 10);
      if (!isNaN(parsed) && parsed >= 40 && parsed <= 300) {
        setInitialTempo(parsed);
      }
    }
  }, []);

  const ostinatoStatuses = useMemo(() => {
    if (!activeSession) return new Map<Ostinato, { passed: boolean; attemptCount: number }>();
    return getOstinatoStatusesForSegment(activeSession.currentSegmentId);
  }, [activeSession?.currentSegmentId, currentSegmentAttempts]);

  const handleStartSession = useCallback(() => {
    if (selectedItemId) {
      startSession(selectedItemId, initialTempo);
    }
  }, [selectedItemId, initialTempo, startSession]);

  const handleEndSession = useCallback(() => {
    const sessionId = endSession();
    if (sessionId) {
      router.push(`/session/${sessionId}` as any);
    }
  }, [endSession, router]);

  const handleUndo = useCallback(() => {
    undoLastAttempt();
  }, [undoLastAttempt]);

  const handleDismissUndo = useCallback(() => {
    useSessionStore.setState({ lastLoggedAttemptId: null });
  }, []);

  // Between segments — break screen
  if (activeSession && betweenSegments) {
    const segmentStats = lastEndedSegmentId
      ? getSegmentSummary(lastEndedSegmentId)
      : { attemptCount: 0, ostinatosPassed: 0, avgMistakes: 0 };

    return (
      <View style={styles.container}>
        <RNView style={styles.breakContent}>
          <Text style={styles.breakTitle}>
            Nice work on Segment {activeSession.segmentNumber}!
          </Text>
          <RNView style={styles.statsRow}>
            <StatItem label="Attempts" value={String(segmentStats.attemptCount)} />
            <StatItem label="Passed" value={`${segmentStats.ostinatosPassed}/8`} />
            <StatItem label="Avg Mistakes" value={String(segmentStats.avgMistakes)} />
          </RNView>
          <Text style={styles.breakSubtext}>Take a break when you're ready</Text>
          <Pressable style={styles.primaryButton} onPress={startNewSegment}>
            <Text style={styles.primaryButtonText}>
              Start Segment {activeSession.segmentNumber + 1}
            </Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={handleEndSession}>
            <Text style={styles.dangerButtonText}>End Session</Text>
          </Pressable>
        </RNView>
      </View>
    );
  }

  // Active session — the logger
  if (activeSession) {
    const selectedItem = curriculumItems.find(
      (i) => i.id === activeSession.curriculumItemId,
    );

    const sheet = getSheetForCurriculum(activeSession.curriculumItemId);

    const loggerContent = (
      <>
        <RNView style={styles.sessionHeader}>
          <RNView>
            <Text style={styles.curriculumName}>
              {selectedItem?.name ?? 'Practice'}
            </Text>
            <Text style={styles.segmentLabel}>
              Segment {activeSession.segmentNumber}
            </Text>
          </RNView>
          <SessionTimer startedAt={activeSession.sessionStartedAt} />
        </RNView>

        {sheet && (
          <Pressable
            style={styles.sheetMusicButton}
            onPress={() => router.push(`/sheet-music/${sheet.id}` as any)}
          >
            <Text style={styles.sheetMusicButtonText}>View Sheet Music</Text>
          </Pressable>
        )}

        <OstinatoSelector
          selectedOstinato={activeSession.selectedOstinato}
          onSelect={selectOstinato}
          ostinatoStatuses={ostinatoStatuses}
          curriculumItemId={activeSession.curriculumItemId}
        />

        <AttemptLogger
          tempo={activeSession.tempo}
          mistakeCount={activeSession.mistakeCount}
          ostinatoBroke={activeSession.ostinatoBroke}
          onAdjustTempo={adjustTempo}
          onSetTempo={setTempo}
          onIncrementMistakes={incrementMistakes}
          onDecrementMistakes={decrementMistakes}
          onToggleBroke={toggleOstinatoBroke}
          onLogAttempt={logAttempt}
        />
      </>
    );

    const attemptContent = (
      <>
        <AttemptList
          attempts={currentSegmentAttempts}
          selectedOstinato={activeSession.selectedOstinato}
          onDelete={deleteAttempt}
        />

        <RNView style={styles.footerButtons}>
          <Pressable style={styles.secondaryButton} onPress={endCurrentSegment}>
            <Text style={styles.secondaryButtonText}>End Segment</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={handleEndSession}>
            <Text style={styles.dangerButtonText}>End Session</Text>
          </Pressable>
        </RNView>
      </>
    );

    if (isLandscape) {
      return (
        <RNView style={styles.landscapeContainer}>
          <ScrollView
            style={styles.landscapeLeft}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {loggerContent}
          </ScrollView>
          <ScrollView
            style={styles.landscapeRight}
            contentContainerStyle={styles.scrollContent}
          >
            {attemptContent}
          </ScrollView>
          <UndoBanner
            visible={!!lastLoggedAttemptId}
            onUndo={handleUndo}
            onDismiss={handleDismissUndo}
          />
        </RNView>
      );
    }

    return (
      <RNView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loggerContent}
          {attemptContent}
        </ScrollView>
        <UndoBanner
          visible={!!lastLoggedAttemptId}
          onUndo={handleUndo}
          onDismiss={handleDismissUndo}
        />
      </RNView>
    );
  }

  // Idle — start session
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.idleContent}
    >
      <Text style={styles.appTitle}>SAMA Drum Practice</Text>
      <Pressable style={styles.quoteContainer} onPress={() => setQuoteIndex((i) => i + 1)}>
        <Text style={styles.quoteText}>"{quote.text}"</Text>
        <Text style={styles.quoteSource}>— {quote.source}</Text>
      </Pressable>

      <RNView style={styles.curriculumPicker}>
        <Text style={styles.pickerLabel}>Curriculum Item</Text>
        {curriculumItems.map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.curriculumItem,
              selectedItemId === item.id && styles.curriculumItemSelected,
            ]}
            onPress={() => setSelectedItemId(item.id)}
          >
            <Text
              style={[
                styles.curriculumItemText,
                selectedItemId === item.id && styles.curriculumItemTextSelected,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        ))}
      </RNView>

      <Pressable style={styles.startButton} onPress={handleStartSession}>
        <Text style={styles.startButtonText}>Start Practice</Text>
      </Pressable>

      <RNView style={styles.librarySection}>
        <SheetMusicLibrary />
      </RNView>
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <RNView style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </RNView>
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
  idleContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  // Landscape
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  landscapeLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  landscapeRight: {
    flex: 1,
  },

  // Session header
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  curriculumName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  segmentLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  // Idle state
  appTitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  quoteContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  quoteText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  quoteSource: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  curriculumPicker: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  pickerLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  curriculumItem: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  curriculumItemSelected: {
    borderColor: colors.primary,
  },
  curriculumItemText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  curriculumItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.md,
    minHeight: touchTarget.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.background,
  },
  librarySection: {
    width: '100%',
    marginTop: spacing.xxl,
  },
  sheetMusicButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sheetMusicButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },

  // Footer buttons
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dangerButton: {
    flex: 1,
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerDim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  dangerButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.danger,
  },
  primaryButton: {
    width: '100%',
    minHeight: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.background,
  },

  // Break screen
  breakContent: {
    alignItems: 'center',
    gap: spacing.xl,
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  breakTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
  },
  breakSubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
