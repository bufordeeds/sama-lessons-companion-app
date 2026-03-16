import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Pressable, Modal, ScrollView, View as RNView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/Themed';
import { OstinatoSelector } from './OstinatoSelector';
import { MistakeCounter } from './MistakeCounter';
import { useSessionStore } from '@/stores/sessionStore';
import { getOstinatoStatusesForSegment } from '@/db/queries';
import type { Ostinato } from '@/constants/curriculum';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface CompactAttemptLoggerProps {
  visible: boolean;
  onClose: () => void;
  curriculumItemId: string;
}

export function CompactAttemptLogger({
  visible,
  onClose,
  curriculumItemId,
}: CompactAttemptLoggerProps) {
  const activeSession = useSessionStore((s) => s.activeSession);
  const currentSegmentAttempts = useSessionStore((s) => s.currentSegmentAttempts);
  const {
    selectOstinato,
    incrementMistakes,
    decrementMistakes,
    toggleOstinatoBroke,
    logAttempt,
    deleteAttempt,
  } = useSessionStore();

  const [ostinatoStatuses, setOstinatoStatuses] = useState(
    new Map<Ostinato, { passed: boolean; attemptCount: number }>(),
  );

  useEffect(() => {
    if (!activeSession) {
      setOstinatoStatuses(new Map());
      return;
    }
    (async () => {
      const statuses = await getOstinatoStatusesForSegment(activeSession.currentSegmentId);
      setOstinatoStatuses(statuses);
    })();
  }, [activeSession?.currentSegmentId, currentSegmentAttempts]);

  const filteredAttempts = useMemo(() => {
    if (!activeSession) return [];
    return currentSegmentAttempts.filter(
      (a) => a.ostinato === activeSession.selectedOstinato,
    );
  }, [currentSegmentAttempts, activeSession?.selectedOstinato]);

  if (!activeSession) return null;

  const handleLog = () => {
    logAttempt();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <RNView style={styles.handle} />

          <Text style={styles.title}>Log Attempt</Text>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
          <OstinatoSelector
            selectedOstinato={activeSession.selectedOstinato}
            onSelect={selectOstinato}
            ostinatoStatuses={ostinatoStatuses}
            curriculumItemId={curriculumItemId}
          />

          {/* Attempt list for selected ostinato */}
          {filteredAttempts.length > 0 && (
            <RNView style={styles.attemptSection}>
              <Text style={styles.attemptHeader}>
                Attempts for {activeSession.selectedOstinato}
              </Text>
              {filteredAttempts.map((item, index) => {
                const passed = item.mistakes <= 3 && item.ostinato_broke === 0;
                const broke = item.ostinato_broke === 1;
                return (
                  <RNView key={item.id} style={styles.attemptRow}>
                    <RNView style={styles.attemptRowContent}>
                      <Text style={styles.attemptNum}>#{index + 1}</Text>
                      <Text style={styles.attemptMistakes}>
                        {item.mistakes} mistake{item.mistakes !== 1 ? 's' : ''}
                      </Text>
                      {passed && (
                        <RNView style={styles.passedBadge}>
                          <Ionicons name="checkmark" size={12} color={colors.success} />
                          <Text style={styles.passedText}>Passed</Text>
                        </RNView>
                      )}
                      {broke && (
                        <RNView style={styles.brokeBadge}>
                          <Text style={styles.brokeTagText}>Broke</Text>
                        </RNView>
                      )}
                    </RNView>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => deleteAttempt(item.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </RNView>
                );
              })}
            </RNView>
          )}

          <RNView style={styles.tempoRow}>
            <Text style={styles.tempoLabel}>Tempo</Text>
            <Text style={styles.tempoValue}>{activeSession.tempo} BPM</Text>
          </RNView>

          {/* Bottom split: mistakes left, actions right */}
          <RNView style={styles.bottomRow}>
            <RNView style={styles.bottomLeft}>
              <MistakeCounter
                count={activeSession.mistakeCount}
                onIncrement={incrementMistakes}
                onDecrement={decrementMistakes}
              />
            </RNView>

            <RNView style={styles.bottomRight}>
              <Pressable
                style={[
                  styles.brokeButton,
                  activeSession.ostinatoBroke && styles.brokeButtonActive,
                ]}
                onPress={toggleOstinatoBroke}
              >
                <Text
                  style={[
                    styles.brokeText,
                    activeSession.ostinatoBroke && styles.brokeTextActive,
                  ]}
                >
                  Broke
                </Text>
              </Pressable>

              <Pressable style={styles.logButton} onPress={handleLog}>
                <Text style={styles.logButtonText}>LOG</Text>
              </Pressable>
            </RNView>
          </RNView>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  tempoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tempoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  tempoValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  attemptSection: {
    gap: spacing.xs,
  },
  attemptHeader: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetScrollContent: {
    gap: spacing.lg,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  attemptRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  attemptNum: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 30,
  },
  attemptMistakes: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  passedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  passedText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '600',
  },
  brokeBadge: {
    backgroundColor: colors.dangerDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  brokeTagText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  bottomLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomRight: {
    flex: 1,
    gap: spacing.sm,
  },
  brokeButton: {
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  brokeButtonActive: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
  },
  brokeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
  },
  brokeTextActive: {
    color: colors.white,
  },
  logButton: {
    flex: 1,
    minHeight: touchTarget.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  logButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 1,
  },
});
