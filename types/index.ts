import type { Ostinato } from '@/constants/curriculum';

// ── Database Row Types ──────────────────────────────────────────────

export interface CurriculumItemRow {
  id: string;
  name: string;
  type: 'fundamentals' | 'rhythm_series';
  series_number: number | null;
  description: string | null;
  sort_order: number;
}

export interface PracticeSessionRow {
  id: string;
  curriculum_item_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  video_url: string | null;
  created_at: string;
}

export interface SessionSegmentRow {
  id: string;
  session_id: string;
  segment_number: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface AttemptRow {
  id: string;
  session_segment_id: string;
  curriculum_item_id: string;
  ostinato: Ostinato;
  tempo: number;
  mistakes: number;
  ostinato_broke: number; // SQLite boolean: 0 or 1
  notes: string | null;
  created_at: string;
}

// ── Display / Derived Types ─────────────────────────────────────────

export type MasteryStatus = 'not_started' | 'in_progress' | 'passed' | 'mastered';

export interface OstinatoStatus {
  passed: boolean;
  attemptCount: number;
}

export interface AttemptDisplay {
  id: string;
  attemptNumber: number;
  mistakes: number;
  ostinatoBroke: boolean;
  passed: boolean;
  tempo: number;
  ostinato: Ostinato;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  curriculumItemId: string;
  curriculumItemName: string;
  segmentCount: number;
  durationMinutes: number;
  totalAttempts: number;
  avgMistakes: number;
  minTempo: number;
  maxTempo: number;
  ostinatosPassed: number;
  totalBreaks: number;
}

export interface SegmentSummary {
  segmentNumber: number;
  attemptCount: number;
  ostinatosPassed: number;
  avgMistakes: number;
}
