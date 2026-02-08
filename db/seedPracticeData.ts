import type { Ostinato } from '@/constants/curriculum';
import { randomUUID } from 'expo-crypto';
import {
	createAttempt,
	createSegment,
	createSession,
	endSegment,
	endSession,
	getPreference,
	setPreference
} from './queries';

const SEED_KEY = 'practice_data_seeded_v3';
const CURRICULUM_ID = 'rhythm-series-2';

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

// Handwritten notes: 1 session with 4 segments — Rhythm Series 2, Feb 8
const SEGMENTS: SegmentData[] = [
	// Segment 1 — 9:00–9:30 AM
	// lets add this note in future seed data for 02/08/2026: "This segment was a bit rough, with a few more mistakes than usual. I struggled with the 4A ostinato, especially towards the end. I think I was getting tired by then. The 1B and 2B attempts were better, but I still had some trouble with the 4B ostinato. Overall, it was a good practice session, but I need to focus on improving my consistency and endurance for the longer segments."Remember. Let the ostinattos flow. Your focus should be mainly on reading properly. And since these notes are easy to read, your mind should remain calm while doing the exercises.
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

	const sessionId = randomUUID();
	const sessionStartedAt = SEGMENTS[0].startedAt;
	const sessionEndedAt = SEGMENTS[SEGMENTS.length - 1].endedAt;

	createSession(sessionId, sessionStartedAt);

	for (let s = 0; s < SEGMENTS.length; s++) {
		const seg = SEGMENTS[s];
		const segmentId = randomUUID();

		createSegment(segmentId, sessionId, s + 1, seg.startedAt);

		for (const a of seg.attempts) {
			createAttempt(
				randomUUID(),
				segmentId,
				CURRICULUM_ID,
				a.ostinato,
				a.tempo,
				a.mistakes,
				a.broke
			);
		}

		endSegment(segmentId, seg.endedAt);
	}

	endSession(sessionId, sessionEndedAt);
	setPreference(SEED_KEY, 'true');
}
