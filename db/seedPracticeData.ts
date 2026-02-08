import { randomUUID } from 'expo-crypto';
import {
  createSession,
  endSession,
  createSegment,
  endSegment,
  createAttempt,
  getPreference,
  setPreference,
} from './queries';
import type { Ostinato } from '@/constants/curriculum';

const SEED_KEY = 'practice_data_seeded';
const CURRICULUM_ID = 'rhythm-series-2';

interface AttemptData {
  ostinato: Ostinato;
  tempo: number;
  mistakes: number;
  broke: boolean;
}

interface SessionData {
  date: string; // ISO date for started_at
  attempts: AttemptData[];
}

// Handwritten notes: 4 sessions of Rhythm Series 2
const SESSIONS: SessionData[] = [
  // Session 1 — Feb 8, 9:00 AM
  {
    date: '2026-02-08T09:00:00.000Z',
    attempts: [
      { ostinato: '1A', tempo: 100, mistakes: 3, broke: false },
      { ostinato: '2A', tempo: 100, mistakes: 3, broke: false },
      { ostinato: '3A', tempo: 100, mistakes: 3, broke: false },
      { ostinato: '4A', tempo: 100, mistakes: 4, broke: false },
      { ostinato: '4A', tempo: 100, mistakes: 3, broke: false },
      { ostinato: '1B', tempo: 100, mistakes: 2, broke: false },
      { ostinato: '2B', tempo: 100, mistakes: 1, broke: false },
      { ostinato: '3B', tempo: 100, mistakes: 2, broke: false },
      { ostinato: '4B', tempo: 100, mistakes: 4, broke: false },
      { ostinato: '4B', tempo: 100, mistakes: 3, broke: false },
    ],
  },
  // Session 2 — Feb 8, 10:00 AM
  {
    date: '2026-02-08T10:00:00.000Z',
    attempts: [
      { ostinato: '1A', tempo: 100, mistakes: 2, broke: false },
      { ostinato: '2A', tempo: 100, mistakes: 2, broke: false },
      { ostinato: '3A', tempo: 100, mistakes: 2, broke: false },
      { ostinato: '4A', tempo: 100, mistakes: 4, broke: false },
      { ostinato: '4A', tempo: 100, mistakes: 4, broke: false },
      { ostinato: '4A', tempo: 100, mistakes: 1, broke: false },
      { ostinato: '1B', tempo: 100, mistakes: 5, broke: false },
      { ostinato: '1B', tempo: 100, mistakes: 1, broke: false },
      { ostinato: '2B', tempo: 100, mistakes: 1, broke: false },
      { ostinato: '3B', tempo: 100, mistakes: 2, broke: false },
      { ostinato: '4B', tempo: 100, mistakes: 5, broke: false },
      { ostinato: '4B', tempo: 100, mistakes: 3, broke: false },
    ],
  },
  // Session 3 — Feb 8, 11:00 AM
  {
    date: '2026-02-08T11:00:00.000Z',
    attempts: [
      { ostinato: '1A', tempo: 90, mistakes: 1, broke: false },
      { ostinato: '2A', tempo: 90, mistakes: 4, broke: true },
      { ostinato: '2A', tempo: 90, mistakes: 5, broke: false },
      { ostinato: '2A', tempo: 90, mistakes: 3, broke: false },
      { ostinato: '3A', tempo: 90, mistakes: 1, broke: false },
      { ostinato: '4A', tempo: 90, mistakes: 2, broke: false },
      { ostinato: '1B', tempo: 90, mistakes: 1, broke: false },
      { ostinato: '2B', tempo: 90, mistakes: 3, broke: false },
      { ostinato: '3B', tempo: 90, mistakes: 2, broke: false },
      { ostinato: '4B', tempo: 90, mistakes: 3, broke: false },
    ],
  },
  // Session 4 — Feb 8, 12:00 PM
  {
    date: '2026-02-08T12:00:00.000Z',
    attempts: [
      { ostinato: '1A', tempo: 105, mistakes: 1, broke: false },
      { ostinato: '2A', tempo: 105, mistakes: 1, broke: false },
      { ostinato: '3A', tempo: 105, mistakes: 0, broke: true },
      { ostinato: '3A', tempo: 105, mistakes: 0, broke: false },
      { ostinato: '4A', tempo: 105, mistakes: 2, broke: false },
      { ostinato: '1B', tempo: 105, mistakes: 0, broke: false },
      { ostinato: '2B', tempo: 105, mistakes: 0, broke: false },
      { ostinato: '3B', tempo: 105, mistakes: 1, broke: false },
      { ostinato: '4B', tempo: 105, mistakes: 0, broke: true },
      { ostinato: '4B', tempo: 105, mistakes: 4, broke: false },
      { ostinato: '4B', tempo: 105, mistakes: 3, broke: false },
    ],
  },
];

export function seedPracticeData(): void {
  // Only seed once
  if (getPreference(SEED_KEY) === 'true') return;

  for (const session of SESSIONS) {
    const sessionId = randomUUID();
    const segmentId = randomUUID();
    const startedAt = session.date;
    const endedAt = new Date(new Date(startedAt).getTime() + 30 * 60000).toISOString();

    createSession(sessionId, startedAt);
    createSegment(segmentId, sessionId, 1, startedAt);

    for (let i = 0; i < session.attempts.length; i++) {
      const a = session.attempts[i];
      const attemptId = randomUUID();
      createAttempt(
        attemptId,
        segmentId,
        CURRICULUM_ID,
        a.ostinato,
        a.tempo,
        a.mistakes,
        a.broke,
      );
    }

    endSegment(segmentId, endedAt);
    endSession(sessionId, endedAt);
  }

  setPreference(SEED_KEY, 'true');
}
