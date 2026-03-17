import React, { useRef, useState, useCallback } from 'react';
import { Platform, StyleSheet, ScrollView, View as RNView, Pressable, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/Themed';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import { ALL_OSTINATOS, type Ostinato } from '@/constants/curriculum';
import type { AttemptRow, SessionSegmentRow } from '@/types';
import { Badge } from '@/components/shared/Badge';
import { VideoLinkCard, AddVideoButton } from '@/components/history/VideoLinkCard';
import { confirmDestructive } from '@/lib/confirm';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

const TIME_FORMAT = 'YYYY-MM-DDTHH:mm';
const DISPLAY_TIME_FORMAT = 'h:mm A';

interface SessionDetailProps {
  sessionId: string;
  startedAt: string;
  curriculumItemName: string;
  segments: SessionSegmentRow[];
  attempts: AttemptRow[];
  notes: string;
  videoUrl: string;
  onDeleteSegment?: (segmentId: string) => void;
  onUpdateNotes?: (notes: string) => void;
  onUpdateVideoUrl?: (url: string) => void;
  onTapSegment?: (segmentId: string) => void;
  onUpdateSessionTimes?: (startedAt: string, endedAt: string | null) => void;
  onUpdateSegmentTimes?: (segmentId: string, startedAt: string, endedAt: string | null) => void;
}

function DateTimeInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="datetime-local"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        aria-label={label}
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 14,
          fontFamily: 'inherit',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
      />
    );
  }

  return (
    <TextInput
      style={styles.timeInput}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DDTHH:mm"
      placeholderTextColor={colors.textMuted}
    />
  );
}

function EditableTime({
  label,
  startedAt,
  endedAt,
  onSave,
}: {
  label: string;
  startedAt: string;
  endedAt: string | null;
  onSave: (start: string, end: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

  const startEdit = () => {
    setDraftStart(dayjs(startedAt).format(TIME_FORMAT));
    setDraftEnd(endedAt ? dayjs(endedAt).format(TIME_FORMAT) : '');
    setEditing(true);
  };

  const handleSave = () => {
    const newStart = dayjs(draftStart).toISOString();
    const newEnd = draftEnd ? dayjs(draftEnd).toISOString() : null;
    onSave(newStart, newEnd);
    setEditing(false);
  };

  if (editing) {
    return (
      <RNView style={styles.timeEditBlock}>
        <Text style={styles.timeEditLabel}>{label} Start</Text>
        <DateTimeInput value={draftStart} onChange={setDraftStart} label={`${label} start`} />
        <Text style={styles.timeEditLabel}>{label} End</Text>
        <DateTimeInput value={draftEnd} onChange={setDraftEnd} label={`${label} end`} />
        <RNView style={styles.notesActions}>
          <Pressable style={styles.notesCancelButton} onPress={() => setEditing(false)}>
            <Text style={styles.notesCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.notesSaveButton} onPress={handleSave}>
            <Text style={styles.notesSaveText}>Save</Text>
          </Pressable>
        </RNView>
      </RNView>
    );
  }

  const startDisplay = dayjs(startedAt).format(DISPLAY_TIME_FORMAT);
  const endDisplay = endedAt ? dayjs(endedAt).format(DISPLAY_TIME_FORMAT) : 'ongoing';

  return (
    <Pressable onPress={startEdit} style={styles.timeDisplay}>
      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
      <Text style={styles.timeText}>{startDisplay} — {endDisplay}</Text>
      <FontAwesome name="pencil" size={10} color={colors.textMuted} />
    </Pressable>
  );
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

function SwipeableSegment({
  segment,
  segAttempts,
  onDelete,
  onTap,
  onUpdateTimes,
}: {
  segment: SessionSegmentRow;
  segAttempts: AttemptRow[];
  onDelete?: (segmentId: string) => void;
  onTap?: (segmentId: string) => void;
  onUpdateTimes?: (segmentId: string, start: string, end: string | null) => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const byOstinato = new Map<Ostinato, AttemptRow[]>();
  for (const a of segAttempts) {
    const existing = byOstinato.get(a.ostinato) ?? [];
    existing.push(a);
    byOstinato.set(a.ostinato, existing);
  }

  const duration = formatSegmentDuration(segment);

  const handleDelete = () => {
    confirmDestructive(
      'Delete Segment',
      `Delete Segment ${segment.segment_number} and all its attempts?`,
      () => onDelete?.(segment.id),
      () => swipeableRef.current?.close(),
    );
  };

  const renderRightActions = () => (
    <Pressable style={styles.deleteAction} onPress={handleDelete}>
      <Text style={styles.deleteActionText}>Delete</Text>
    </Pressable>
  );

  return (
    <GestureHandlerRootView>
    <Swipeable
      ref={swipeableRef}
      renderRightActions={onDelete ? renderRightActions : undefined}
      overshootRight={false}
    >
      <Pressable
        style={styles.segmentBlock}
        onPress={onTap ? () => onTap(segment.id) : undefined}
        disabled={!onTap}
      >
        <RNView style={styles.segmentTitleRow}>
          <Text style={styles.segmentTitle}>
            Segment {segment.segment_number}
            {duration ? ` (${duration})` : ''}
          </Text>
          {onTap && (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </RNView>

        {onUpdateTimes && (
          <EditableTime
            label={`Seg ${segment.segment_number}`}
            startedAt={segment.started_at}
            endedAt={segment.ended_at}
            onSave={(start, end) => onUpdateTimes(segment.id, start, end)}
          />
        )}

        {segAttempts.length === 0 ? (
          <Text style={styles.emptySegment}>No attempts</Text>
        ) : (
          <>
            <RNView style={styles.tableHeader}>
              <Text style={[styles.headerLabel, { width: 36 }]}>Ost.</Text>
              <Text style={[styles.headerLabel, { width: 70 }]}>Tempo</Text>
              <Text style={[styles.headerLabel, { flex: 1 }]}>Attempts</Text>
            </RNView>

            {ALL_OSTINATOS.map((ost) => {
              const ostAttempts = byOstinato.get(ost);
              if (!ostAttempts || ostAttempts.length === 0) return null;

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
                            <Ionicons name="checkmark" size={14} color={colors.success} style={styles.passedCheck} />
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
          </>
        )}
      </Pressable>
    </Swipeable>
    </GestureHandlerRootView>
  );
}

export function SessionDetail({
  sessionId,
  startedAt,
  curriculumItemName,
  segments,
  attempts,
  notes,
  videoUrl,
  onDeleteSegment,
  onUpdateNotes,
  onUpdateVideoUrl,
  onTapSegment,
  onUpdateSessionTimes,
  onUpdateSegmentTimes,
}: SessionDetailProps) {
  const date = dayjs(startedAt).format('MMM D, YYYY');
  const lastSegment = segments[segments.length - 1];
  const sessionEndedAt = lastSegment?.ended_at ?? null;
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);

  const handleSaveNotes = useCallback(() => {
    onUpdateNotes?.(draftNotes);
    setIsEditingNotes(false);
  }, [draftNotes, onUpdateNotes]);

  const handleStartEditing = useCallback(() => {
    setDraftNotes(notes);
    setIsEditingNotes(true);
  }, [notes]);

  const attemptsBySegment = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const existing = attemptsBySegment.get(a.session_segment_id) ?? [];
    existing.push(a);
    attemptsBySegment.set(a.session_segment_id, existing);
  }

  return (
    <RNView style={styles.gestureRoot}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <RNView style={styles.header}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.curriculum}>{curriculumItemName}</Text>
          {onUpdateSessionTimes && (
            <EditableTime
              label="Session"
              startedAt={startedAt}
              endedAt={sessionEndedAt}
              onSave={onUpdateSessionTimes}
            />
          )}
        </RNView>

        {/* Notes section */}
        <RNView style={styles.notesBlock}>
          <RNView style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Notes</Text>
            {!isEditingNotes && (
              <Pressable onPress={handleStartEditing} hitSlop={12}>
                <FontAwesome
                  name={notes ? 'pencil' : 'plus'}
                  size={14}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </RNView>
          {isEditingNotes ? (
            <RNView style={styles.notesEditContainer}>
              <TextInput
                style={styles.notesInput}
                value={draftNotes}
                onChangeText={setDraftNotes}
                placeholder="Teacher feedback, things to work on..."
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              <RNView style={styles.notesActions}>
                <Pressable
                  style={styles.notesCancelButton}
                  onPress={() => setIsEditingNotes(false)}
                >
                  <Text style={styles.notesCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.notesSaveButton} onPress={handleSaveNotes}>
                  <Text style={styles.notesSaveText}>Save</Text>
                </Pressable>
              </RNView>
            </RNView>
          ) : notes ? (
            <Pressable onPress={handleStartEditing}>
              <Text style={styles.notesText}>{notes}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleStartEditing}>
              <Text style={styles.notesPlaceholder}>
                Tap to add notes from your lesson...
              </Text>
            </Pressable>
          )}
        </RNView>

        {/* Video link section */}
        {videoUrl ? (
          <VideoLinkCard
            videoUrl={videoUrl}
            onUpdateUrl={onUpdateVideoUrl}
          />
        ) : onUpdateVideoUrl ? (
          <AddVideoButton onAdd={onUpdateVideoUrl} />
        ) : null}

        {segments.map((segment) => (
          <SwipeableSegment
            key={segment.id}
            segment={segment}
            segAttempts={attemptsBySegment.get(segment.id) ?? []}
            onDelete={onDeleteSegment}
            onTap={onTapSegment}
            onUpdateTimes={onUpdateSegmentTimes}
          />
        ))}
      </ScrollView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
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
  segmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySegment: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 2,
  },
  headerLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    marginLeft: 2,
  },
  deleteAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
  },
  deleteActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  notesBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  notesPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  notesEditContainer: {
    gap: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  notesCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  notesCancelText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  notesSaveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  notesSaveText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.background,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  timeEditBlock: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  timeEditLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontVariant: ['tabular-nums'],
  },
});
