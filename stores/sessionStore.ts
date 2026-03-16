import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { getOstinatosForCurriculum, type Ostinato } from '@/constants/curriculum';
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
  startSession: (curriculumItemId: string, tempo?: number) => Promise<void>;
  endSession: () => Promise<string | null>;
  startNewSegment: () => Promise<void>;
  endCurrentSegment: () => Promise<void>;

  resumeSession: (sessionId: string) => Promise<void>;
  resumeSegment: (sessionId: string, segmentId: string) => Promise<void>;

  // During practice
  selectOstinato: (ostinato: Ostinato) => void;
  setTempo: (tempo: number) => void;
  adjustTempo: (delta: number) => void;
  incrementMistakes: () => void;
  decrementMistakes: () => void;
  toggleOstinatoBroke: () => void;
  logAttempt: () => Promise<void>;
  deleteAttempt: (attemptId: string) => Promise<void>;
  undoLastAttempt: () => Promise<void>;
  resetAttemptInputs: () => void;
  reloadAttempts: () => Promise<void>;
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

  startSession: async (curriculumItemId: string, tempo?: number) => {
    const now = new Date().toISOString();
    const sessionId = randomUUID();
    const segmentId = randomUUID();

    const ostinatos = getOstinatosForCurriculum(curriculumItemId);
    await queries.createSession(sessionId, now, curriculumItemId);
    await queries.createSegment(segmentId, sessionId, 1, now);

    set({
      activeSession: {
        sessionId,
        currentSegmentId: segmentId,
        segmentNumber: 1,
        curriculumItemId,
        selectedOstinato: ostinatos[0] ?? '1A',
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

  resumeSession: async (sessionId: string) => {
    const session = await queries.getSessionById(sessionId);
    if (!session) return;

    // Reopen session
    await queries.reopenSession(sessionId);

    // Get curriculum item from existing attempts
    const curriculumItemId = (await queries.getSessionCurriculumItemId(sessionId)) ?? '';
    const ostinatos = getOstinatosForCurriculum(curriculumItemId);

    // Get last segment to determine next segment number
    const lastSegment = await queries.getLastSegmentForSession(sessionId);
    const nextNumber = lastSegment ? lastSegment.segment_number + 1 : 1;

    // Get last attempt's tempo to restore it
    const lastAttempts = await queries.getSessionAttemptsGrouped(sessionId);
    const lastTempo = lastAttempts.length > 0
      ? lastAttempts[lastAttempts.length - 1].tempo
      : 100;

    // Create a new segment for the resumed session
    const now = new Date().toISOString();
    const segmentId = randomUUID();
    await queries.createSegment(segmentId, sessionId, nextNumber, now);

    set({
      activeSession: {
        sessionId,
        currentSegmentId: segmentId,
        segmentNumber: nextNumber,
        curriculumItemId,
        selectedOstinato: ostinatos[0] ?? '1A',
        tempo: lastTempo,
        mistakeCount: 0,
        ostinatoBroke: false,
        sessionStartedAt: session.started_at,
        segmentStartedAt: now,
      },
      currentSegmentAttempts: [],
      betweenSegments: false,
      lastEndedSegmentId: null,
      lastLoggedAttemptId: null,
    });
  },

  resumeSegment: async (sessionId: string, segmentId: string) => {
    const session = await queries.getSessionById(sessionId);
    if (!session) return;

    const segment = await queries.getSegmentById(segmentId);
    if (!segment) return;

    // Reopen session and segment
    await queries.reopenSession(sessionId);
    await queries.reopenSegment(segmentId);

    const curriculumItemId = (await queries.getSessionCurriculumItemId(sessionId)) ?? '';
    const ostinatos = getOstinatosForCurriculum(curriculumItemId);

    // Load existing attempts for this segment
    const existingAttempts = await queries.getAttemptsBySegment(segmentId);

    // Restore tempo and ostinato from the last attempt in this segment
    const lastAttempt = existingAttempts.length > 0
      ? existingAttempts[existingAttempts.length - 1]
      : null;
    const tempo = lastAttempt?.tempo ?? 100;
    const selectedOstinato = lastAttempt
      ? lastAttempt.ostinato
      : (ostinatos[0] ?? '1A');

    set({
      activeSession: {
        sessionId,
        currentSegmentId: segmentId,
        segmentNumber: segment.segment_number,
        curriculumItemId,
        selectedOstinato,
        tempo,
        mistakeCount: 0,
        ostinatoBroke: false,
        sessionStartedAt: session.started_at,
        segmentStartedAt: segment.started_at,
      },
      currentSegmentAttempts: existingAttempts,
      betweenSegments: false,
      lastEndedSegmentId: null,
      lastLoggedAttemptId: null,
    });
  },

  endSession: async () => {
    const { activeSession, betweenSegments } = get();
    if (!activeSession) return null;

    const now = new Date().toISOString();

    // Close current segment if not already between segments
    if (!betweenSegments) {
      await queries.endSegment(activeSession.currentSegmentId, now);
    }
    await queries.endSession(activeSession.sessionId, now);

    const sessionId = activeSession.sessionId;
    set({
      activeSession: null,
      currentSegmentAttempts: [],
      betweenSegments: false,
      lastEndedSegmentId: null,
    });
    return sessionId;
  },

  endCurrentSegment: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const now = new Date().toISOString();
    await queries.endSegment(activeSession.currentSegmentId, now);

    set({
      betweenSegments: true,
      lastEndedSegmentId: activeSession.currentSegmentId,
    });
  },

  startNewSegment: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const now = new Date().toISOString();
    const segmentId = randomUUID();
    const nextNumber = activeSession.segmentNumber + 1;

    await queries.createSegment(segmentId, activeSession.sessionId, nextNumber, now);

    const newSegOstinatos = getOstinatosForCurriculum(activeSession.curriculumItemId);
    set({
      activeSession: {
        ...activeSession,
        currentSegmentId: segmentId,
        segmentNumber: nextNumber,
        segmentStartedAt: now,
        selectedOstinato: newSegOstinatos[0] ?? '1A',
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

  logAttempt: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    hapticMedium();

    const attemptId = randomUUID();
    await queries.createAttempt(
      attemptId,
      activeSession.currentSegmentId,
      activeSession.curriculumItemId,
      activeSession.selectedOstinato,
      activeSession.tempo,
      activeSession.mistakeCount,
      activeSession.ostinatoBroke,
    );

    // Save preferences
    await queries.setPreference('lastCurriculumItemId', activeSession.curriculumItemId);
    await queries.setPreference('lastTempo', String(activeSession.tempo));

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
    await get().reloadAttempts();
  },

  deleteAttempt: async (attemptId: string) => {
    await queries.deleteAttempt(attemptId);
    const { lastLoggedAttemptId } = get();
    if (lastLoggedAttemptId === attemptId) {
      set({ lastLoggedAttemptId: null });
    }
    await get().reloadAttempts();
  },

  undoLastAttempt: async () => {
    const { lastLoggedAttemptId } = get();
    if (!lastLoggedAttemptId) return;
    await queries.deleteAttempt(lastLoggedAttemptId);
    set({ lastLoggedAttemptId: null });
    await get().reloadAttempts();
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

  reloadAttempts: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    const attempts = await queries.getAttemptsBySegment(activeSession.currentSegmentId);
    set({ currentSegmentAttempts: attempts });
  },
}));
