import type { Ostinato } from '@/constants/curriculum';
import { randomUUID } from 'expo-crypto';
import {
	createAttempt,
	createSegment,
	createSession,
	deleteSession,
	endSegment,
	endSession,
	getPreference,
	setPreference,
	updateSessionNotes,
	updateSessionVideoUrl,
	getDb
} from './queries';

const SEED_KEY = 'practice_data_seeded_v5';
const OLD_SEED_KEYS = ['practice_data_seeded', 'practice_data_seeded_v2', 'practice_data_seeded_v3', 'practice_data_seeded_v4'];

interface AttemptData {
	ostinato: Ostinato;
	tempo: number;
	mistakes: number;
	broke: boolean;
}

interface SegmentData {
	startedAt: string;
	endedAt: string;
	attempts: AttemptData[];
}

// ── Session 1: Walking Beat lesson — May 22, 2025 ──────────────────
// No ostinatos — fundamentals lesson getting comfortable with the walking beat:
// Kick on downbeats, hi-hat pedal on upbeats.
// 4 sixteenth notes on snare + 3 toms per beat for 4 bars, ending with crash on 1.

const WALKING_BEAT_NOTES =
	'2nd lesson ever. Walking beat fundamentals — kick on downbeats, hi-hat pedal on upbeats. ' +
	'4 sixteenth notes on snare and 3 toms per beat, 4 bars, crash on 1.\n\n' +
	'Teacher notes: Don\'t play faster than you can think. Go slow — "Napoleon said go slow because I\'m in a hurry." ' +
	'Weakest point is rushing. Be patient, go step by step. ' +
	'Hi-hat is independent — that\'s the work we\'re doing. ' +
	'Practice removing left hand then right hand from 16th note groups to build independence.';

const WALKING_BEAT_VIDEO = 'https://youtu.be/6NwNpBGLVKA?si=i-rdTqST8xcIaeHY';

// ── Session 2: Rhythm Series 2 — Feb 8, 2026 ───────────────────────

const RS2_NOTES =
	'Let the ostinatos flow. Focus should be mainly on reading properly. ' +
	'Since these notes are easy to read, your mind should remain calm while doing the exercises. ' +
	'Struggled with 4A ostinato — need to focus on improving consistency and endurance for longer segments.';

const RS2_SEGMENTS: SegmentData[] = [
	// Segment 1 — 9:00–9:30 AM
	{
		startedAt: '2026-02-08T09:00:00.000Z',
		endedAt: '2026-02-08T09:30:00.000Z',
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
			{ ostinato: '4B', tempo: 100, mistakes: 3, broke: false }
		]
	},
	// Segment 2 — 10:00–10:30 AM
	{
		startedAt: '2026-02-08T10:00:00.000Z',
		endedAt: '2026-02-08T10:30:00.000Z',
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
			{ ostinato: '4B', tempo: 100, mistakes: 3, broke: false }
		]
	},
	// Segment 3 — 11:00–11:30 AM
	{
		startedAt: '2026-02-08T11:00:00.000Z',
		endedAt: '2026-02-08T11:30:00.000Z',
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
			{ ostinato: '4B', tempo: 90, mistakes: 3, broke: false }
		]
	},
	// Segment 4 — 12:00–12:30 PM
	{
		startedAt: '2026-02-08T12:00:00.000Z',
		endedAt: '2026-02-08T12:30:00.000Z',
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
			{ ostinato: '4B', tempo: 105, mistakes: 3, broke: false }
		]
	}
];

export function seedPracticeData(): void {
	// Only seed once
	if (getPreference(SEED_KEY) === 'true') return;

	// Clean up sessions from older seed versions to prevent duplicates
	const hadOldSeed = OLD_SEED_KEYS.some((k) => getPreference(k) === 'true');
	if (hadOldSeed) {
		// Delete all seeded sessions (they have no user edits worth keeping)
		const db = getDb();
		const sessions = db.getAllSync<{ id: string }>(
			'SELECT id FROM practice_sessions'
		);
		for (const s of sessions) {
			deleteSession(s.id);
		}
		for (const k of OLD_SEED_KEYS) {
			db.runSync('DELETE FROM user_preferences WHERE key = ?', k);
		}
	}

	// ── Session 1: Walking Beat — May 22, 2025 ──
	// Fundamentals lesson, no ostinato attempts — just notes + video
	const walkingId = randomUUID();
	const walkingStart = '2025-05-22T15:00:00.000Z';
	const walkingEnd = '2025-05-22T15:30:00.000Z';

	createSession(walkingId, walkingStart, 'walking-beat');
	const walkingSegId = randomUUID();
	createSegment(walkingSegId, walkingId, 1, walkingStart);
	endSegment(walkingSegId, walkingEnd);
	endSession(walkingId, walkingEnd);
	updateSessionNotes(walkingId, WALKING_BEAT_NOTES);
	updateSessionVideoUrl(walkingId, WALKING_BEAT_VIDEO);

	// ── Session 2: Rhythm Series 2 — Feb 8, 2026 ──
	const rs2Id = randomUUID();
	const rs2StartedAt = RS2_SEGMENTS[0].startedAt;
	const rs2EndedAt = RS2_SEGMENTS[RS2_SEGMENTS.length - 1].endedAt;

	createSession(rs2Id, rs2StartedAt, 'rhythm-series-2');

	for (let s = 0; s < RS2_SEGMENTS.length; s++) {
		const seg = RS2_SEGMENTS[s];
		const segmentId = randomUUID();

		createSegment(segmentId, rs2Id, s + 1, seg.startedAt);

		for (const a of seg.attempts) {
			createAttempt(
				randomUUID(),
				segmentId,
				'rhythm-series-2',
				a.ostinato,
				a.tempo,
				a.mistakes,
				a.broke
			);
		}

		endSegment(segmentId, seg.endedAt);
	}

	endSession(rs2Id, rs2EndedAt);
	updateSessionNotes(rs2Id, RS2_NOTES);

	setPreference(SEED_KEY, 'true');
}
