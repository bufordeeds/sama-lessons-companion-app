import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import type { Ostinato } from '@/constants/curriculum';
import type { AttemptRow } from '@/types';
import * as queries from '@/db/queries';
import { hapticLight, hapticMedium, hapticSelection, hapticNotification } from '@/utils/haptics';

interface ActiveSession {
  sessionId: string;
  currentSegmentId: string;
  segmentNumber: number;
  curriculumItemId: string;
  selectedOstinato: Ostinato;
  tempo: number;
  mistakeCount: number;
  ostinatoBroke: boolean;
  sessionStartedAt: string;
  segmentStartedAt: string;
}

interface SessionStore {
  activeSession: ActiveSession | null;
  currentSegmentAttempts: AttemptRow[];
  betweenSegments: boolean;
  lastEndedSegmentId: string | null;
  lastLoggedAttemptId: string | null;

  // Session lifecycle
  startSession: (curriculumItemId: string, tempo?: number) => void;
  endSession: () => string | null;
  startNewSegment: () => void;
  endCurrentSegment: () => void;

  // During practice
  selectOstinato: (ostinato: Ostinato) => void;
  setTempo: (tempo: number) => void;
  adjustTempo: (delta: number) => void;
  incrementMistakes: () => void;
  decrementMistakes: () => void;
  toggleOstinatoBroke: () => void;
  logAttempt: () => void;
  deleteAttempt: (attemptId: string) => void;
  undoLastAttempt: () => void;
  resetAttemptInputs: () => void;
  reloadAttempts: () => void;
}

function clampTempo(tempo: number): number {
  return Math.max(40, Math.min(300, tempo));
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeSession: null,
  currentSegmentAttempts: [],
  betweenSegments: false,
  lastEndedSegmentId: null,
  lastLoggedAttemptId: null,

  startSession: (curriculumItemId: string, tempo?: number) => {
    const now = new Date().toISOString();
    const sessionId = randomUUID();
    const segmentId = randomUUID();

    queries.createSession(sessionId, now);
    queries.createSegment(segmentId, sessionId, 1, now);

    set({
      activeSession: {
        sessionId,
        currentSegmentId: segmentId,
        segmentNumber: 1,
        curriculumItemId,
        selectedOstinato: '1A',
        tempo: tempo ?? 100,
        mistakeCount: 0,
        ostinatoBroke: false,
        sessionStartedAt: now,
        segmentStartedAt: now,
      },
      currentSegmentAttempts: [],
      betweenSegments: false,
      lastEndedSegmentId: null,
    });
  },

  endSession: () => {
    const { activeSession, betweenSegments } = get();
    if (!activeSession) return null;

    const now = new Date().toISOString();

    // Close current segment if not already between segments
    if (!betweenSegments) {
      queries.endSegment(activeSession.currentSegmentId, now);
    }
    queries.endSession(activeSession.sessionId, now);

    const sessionId = activeSession.sessionId;
    set({
      activeSession: null,
      currentSegmentAttempts: [],
      betweenSegments: false,
      lastEndedSegmentId: null,
    });
    return sessionId;
  },

  endCurrentSegment: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const now = new Date().toISOString();
    queries.endSegment(activeSession.currentSegmentId, now);

    set({
      betweenSegments: true,
      lastEndedSegmentId: activeSession.currentSegmentId,
    });
  },

  startNewSegment: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const now = new Date().toISOString();
    const segmentId = randomUUID();
    const nextNumber = activeSession.segmentNumber + 1;

    queries.createSegment(segmentId, activeSession.sessionId, nextNumber, now);

    set({
      activeSession: {
        ...activeSession,
        currentSegmentId: segmentId,
        segmentNumber: nextNumber,
        segmentStartedAt: now,
        selectedOstinato: '1A',
        mistakeCount: 0,
        ostinatoBroke: false,
      },
      currentSegmentAttempts: [],
      betweenSegments: false,
      lastEndedSegmentId: null,
    });
  },

  selectOstinato: (ostinato: Ostinato) => {
    const { activeSession } = get();
    if (!activeSession) return;
    hapticSelection();
    set({
      activeSession: {
        ...activeSession,
        selectedOstinato: ostinato,
        mistakeCount: 0,
        ostinatoBroke: false,
      },
    });
  },

  setTempo: (tempo: number) => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: { ...activeSession, tempo: clampTempo(tempo) },
    });
  },

  adjustTempo: (delta: number) => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: {
        ...activeSession,
        tempo: clampTempo(activeSession.tempo + delta),
      },
    });
  },

  incrementMistakes: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    hapticLight();
    set({
      activeSession: {
        ...activeSession,
        mistakeCount: activeSession.mistakeCount + 1,
      },
    });
  },

  decrementMistakes: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    hapticLight();
    set({
      activeSession: {
        ...activeSession,
        mistakeCount: Math.max(0, activeSession.mistakeCount - 1),
      },
    });
  },

  toggleOstinatoBroke: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    hapticNotification();
    set({
      activeSession: {
        ...activeSession,
        ostinatoBroke: !activeSession.ostinatoBroke,
      },
    });
  },

  logAttempt: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    hapticMedium();

    const attemptId = randomUUID();
    queries.createAttempt(
      attemptId,
      activeSession.currentSegmentId,
      activeSession.curriculumItemId,
      activeSession.selectedOstinato,
      activeSession.tempo,
      activeSession.mistakeCount,
      activeSession.ostinatoBroke,
    );

    // Save preferences
    queries.setPreference('lastCurriculumItemId', activeSession.curriculumItemId);
    queries.setPreference('lastTempo', String(activeSession.tempo));

    // Reset inputs but keep ostinato and tempo
    set({
      activeSession: {
        ...activeSession,
        mistakeCount: 0,
        ostinatoBroke: false,
      },
      lastLoggedAttemptId: attemptId,
    });

    // Reload attempts
    get().reloadAttempts();
  },

  deleteAttempt: (attemptId: string) => {
    queries.deleteAttempt(attemptId);
    const { lastLoggedAttemptId } = get();
    if (lastLoggedAttemptId === attemptId) {
      set({ lastLoggedAttemptId: null });
    }
    get().reloadAttempts();
  },

  undoLastAttempt: () => {
    const { lastLoggedAttemptId } = get();
    if (!lastLoggedAttemptId) return;
    queries.deleteAttempt(lastLoggedAttemptId);
    set({ lastLoggedAttemptId: null });
    get().reloadAttempts();
  },

  resetAttemptInputs: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: {
        ...activeSession,
        mistakeCount: 0,
        ostinatoBroke: false,
      },
    });
  },

  reloadAttempts: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    const attempts = queries.getAttemptsBySegment(activeSession.currentSegmentId);
    set({ currentSegmentAttempts: attempts });
  },
}));
