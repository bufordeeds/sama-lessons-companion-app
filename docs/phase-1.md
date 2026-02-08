# SAMA Drum Practice — Phase 1: Practice Logger (Detailed Spec)

## Overview

Phase 1 delivers the core practice session logger — a real-time logging interface that replaces handwritten notes. The user selects an exercise and ostinato, logs each attempt with a mistake count and optional flags, and can review their session history. This phase captures all the data needed to power future dashboard and progression features.

---

## Tech Stack & Project Setup

```bash
# Initialize
npx create-expo-app@latest sama-drum-practice --template tabs
cd sama-drum-practice

# Core dependencies
npx expo install expo-router expo-sqlite
npm install zustand dayjs

# UI (choose one — recommend staying light)
npm install react-native-reanimated
```

### Architecture Decisions

- **Local-first storage**: Use `expo-sqlite` for all data in Phase 1. No Supabase yet — keep it simple and offline-capable. Supabase integration comes in Phase 2+ when we need sync/auth.
- **State management**: Zustand for active session state (current ostinato, timer, attempt counts). SQLite for persistence.
- **Navigation**: Expo Router with tab layout — two tabs for Phase 1: "Practice" and "History"

### Project Structure

```
app/
  (tabs)/
    _layout.tsx          # Tab navigator
    index.tsx            # Practice tab (home + logger)
    history.tsx          # Session history tab
  _layout.tsx            # Root layout
  session/
    [id].tsx             # Session detail view

components/
  practice/
    OstinatoSelector.tsx    # Grid of 1A–4B buttons
    AttemptLogger.tsx        # The core logging UI
    SessionTimer.tsx         # Elapsed time display
    SegmentTracker.tsx       # Track segments within a session
    AttemptList.tsx          # Scrollable list of logged attempts
    MistakeCounter.tsx       # +/- counter for mistakes
    TempoInput.tsx           # BPM input with increment buttons

  history/
    SessionCard.tsx          # Summary card for a past session
    SessionDetail.tsx        # Full attempt breakdown

  shared/
    Badge.tsx                # Status badges (passed, mastered, etc.)
    Header.tsx

db/
  schema.ts              # SQLite table definitions and migrations
  queries.ts             # All database operations
  seed.ts                # Initial curriculum data

stores/
  sessionStore.ts        # Zustand store for active practice session

types/
  index.ts               # TypeScript type definitions

constants/
  curriculum.ts          # Static curriculum data (ostinatos, series)
  theme.ts               # Colors, spacing, typography
```

---

## Data Model (SQLite)

### Tables

```sql
-- Static curriculum data (seeded on first launch)
CREATE TABLE curriculum_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('fundamentals', 'rhythm_series')),
  series_number INTEGER,          -- NULL for fundamentals, 1-10 for rhythm series
  description TEXT,
  sort_order INTEGER NOT NULL
);

-- Each exercise is a curriculum item + ostinato combination
-- We don't need a separate exercises table in Phase 1
-- The attempt itself references the curriculum_item + ostinato

-- Practice sessions (one per "sit down to practice" event)
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,             -- UUID
  started_at TEXT NOT NULL,        -- ISO 8601
  ended_at TEXT,                   -- NULL if in progress
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Segments within a session (e.g., 4x30min blocks)
CREATE TABLE session_segments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES practice_sessions(id),
  segment_number INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual attempts — the core data unit
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  session_segment_id TEXT NOT NULL REFERENCES session_segments(id),
  curriculum_item_id TEXT NOT NULL REFERENCES curriculum_items(id),
  ostinato TEXT NOT NULL CHECK(ostinato IN ('1A','2A','3A','4A','1B','2B','3B','4B')),
  tempo INTEGER NOT NULL,          -- BPM
  mistakes INTEGER NOT NULL DEFAULT 0,
  ostinato_broke INTEGER NOT NULL DEFAULT 0,  -- boolean: 0 or 1
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX idx_attempts_curriculum ON attempts(curriculum_item_id, ostinato);
CREATE INDEX idx_attempts_segment ON attempts(session_segment_id);
CREATE INDEX idx_segments_session ON session_segments(session_id);
```

### Seed Data

```typescript
// constants/curriculum.ts
export const CURRICULUM_ITEMS = [
	{
		id: 'walking-beat',
		name: 'Walking Beat',
		type: 'fundamentals',
		series_number: null,
		description:
			'Kick on downbeats, hi-hat pedal on upbeats. 4 sixteenth notes on snare and 3 toms per beat.',
		sort_order: 1
	},
	{
		id: 'eighth-note-exercises',
		name: 'Eighth Note Rhythm Exercises',
		type: 'fundamentals',
		series_number: null,
		description:
			'Various eighth note kick and snare patterns over rock ostinatos.',
		sort_order: 2
	},
	{
		id: 'rhythm-series-1',
		name: 'Rhythm Series 1',
		type: 'rhythm_series',
		series_number: 1,
		description:
			'32 measures of quarter notes and rests. A ostinatos: snare plays quarters. B ostinatos: kick plays quarters.',
		sort_order: 3
	},
	{
		id: 'rhythm-series-2',
		name: 'Rhythm Series 2',
		type: 'rhythm_series',
		series_number: 2,
		description:
			'32 measures mixing eighth notes, quarter notes, and rests.',
		sort_order: 4
	}
	// Series 3–10 added as unlocked
];

export const OSTINATOS = [
	'1A',
	'2A',
	'3A',
	'4A',
	'1B',
	'2B',
	'3B',
	'4B'
] as const;

export type Ostinato = (typeof OSTINATOS)[number];

export const OSTINATO_DESCRIPTIONS: Record<Ostinato, string> = {
	'1A': 'Ride 8ths, HH ↓, Kick 1&3',
	'2A': 'Ride 8ths, HH ↑, Kick 1&3',
	'3A': 'Ride ↓, HH 8ths, Kick 1&3',
	'4A': 'Ride ↑, HH 8ths, Kick 1&3',
	'1B': 'Ride 8ths, HH ↓, Snare 2&4',
	'2B': 'Ride 8ths, HH ↑, Snare 2&4',
	'3B': 'Ride ↓, HH 8ths, Snare 2&4',
	'4B': 'Ride ↑, HH 8ths, Snare 2&4'
};
```

---

## Screens & Components

### Screen 1: Practice Tab (Home + Logger)

This is the primary screen. Two states: **idle** (no active session) and **active** (session in progress).

#### Idle State

- Large "Start Practice" button
- Quick stats: current streak, last session date
- Currently active curriculum item displayed (e.g., "Rhythm Series 2")
- Option to change active curriculum item

#### Active State — The Logger

This is the most critical screen. It needs to be **dead simple** to use while sitting at a drum kit.

```
┌─────────────────────────────────────────────────────┐
│  Rhythm Series 2          Session 1 of 4    23:41   │
│                                              ⏱️     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ 1A  │ │ 2A  │ │ 3A  │ │ 4A ←│  ← current       │
│  │  ✓  │ │  ✓  │ │  ✓  │ │     │                  │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ 1B  │ │ 2B  │ │ 3B  │ │ 4B  │                  │
│  │     │ │     │ │     │ │     │                  │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
│                                                     │
│  ── Current: 4A @ 100 BPM ──────────────────────   │
│                                                     │
│  Tempo:  [ - ]  100  [ + ]     (±5 increments)     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │    Mistakes:  [ - ]   3   [ + ]             │   │
│  │                                             │   │
│  │    [ 🔴 Ostinato Broke ]                    │   │
│  │                                             │   │
│  │    ┌───────────────────────────────────┐    │   │
│  │    │         LOG ATTEMPT               │    │   │
│  │    └───────────────────────────────────┘    │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── Attempts for 4A ────────────────────────────   │
│  #1: 4 mistakes                                     │
│  #2: 3 mistakes ✓ (passed)                          │
│                                                     │
│  ┌──────────────┐  ┌──────────────────────┐        │
│  │ End Segment   │  │   End Session        │        │
│  └──────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

#### Logger UX Flow

1. **Start session** → Creates a `practice_session` and first `session_segment`
2. **Select curriculum item** (persists — usually stays the same for weeks)
3. **Ostinato grid** shows 1A–4B. Tap to select. Checkmarks show which have passing attempts this segment.
4. **Set tempo** — persists across attempts, ±5 BPM buttons, tap number to type directly
5. **Count mistakes** — large ± buttons, start at 0
6. **"Ostinato Broke" toggle** — prominent red button. When active, the attempt is automatically logged as a failure regardless of mistake count. Visually distinct.
7. **"Log Attempt"** — saves the attempt, resets mistake counter to 0, keeps same ostinato and tempo selected
8. **Advance to next ostinato** — can be manual (tap grid) or auto-advance after a passing attempt (setting)
9. **"End Segment"** → closes current segment, prompts "Take a break! Start segment 2 when ready."
10. **"End Session"** → closes session, shows summary

#### Key Interaction Details

- **Mistake counter starts at 0** and increments up. Most common action is tapping "+" a few times then "Log."
- **Tempo persists** between attempts and between ostinatos within a segment. Only changes when explicitly adjusted.
- **Ostinato broke is a toggle**, not a counter. If it happened, the attempt is flagged. The mistake count still matters (captures how many mistakes before/during the breakdown).
- **Auto-advance setting**: After logging a passing attempt (≤3 mistakes, no ostinato break), optionally auto-select the next ostinato in sequence. Default: off (let user control flow).
- **Undo last attempt**: Swipe left on the most recent attempt in the list, or an undo button that appears for 5 seconds after logging.

### Screen 2: History Tab

Chronological list of past sessions, most recent first.

```
┌─────────────────────────────────────────────┐
│  Practice History                            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Feb 8, 2026 — Rhythm Series 2       │   │
│  │ 4 segments · 2h 45m                 │   │
│  │ 32 attempts · Avg 2.1 mistakes      │   │
│  │ Tempo: 90–105 BPM                   │   │
│  │ ████████░░ 6/8 ostinatos passed     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Feb 7, 2026 — Rhythm Series 2       │   │
│  │ 1 segment · 58m                     │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Screen 3: Session Detail

Tapping a session card opens the full breakdown.

```
┌─────────────────────────────────────────────┐
│ ← Feb 8, 2026 — Rhythm Series 2            │
├─────────────────────────────────────────────┤
│                                             │
│ Segment 1 (30 min)                          │
│ ┌────────┬───────┬──────────────────────┐  │
│ │Ostinato│ Tempo │ Attempts             │  │
│ ├────────┼───────┼──────────────────────┤  │
│ │ 1A     │ 100   │ 3 ✓                  │  │
│ │ 2A     │ 100   │ 3 ✓                  │  │
│ │ 3A     │ 100   │ 3 ✓                  │  │
│ │ 4A     │ 100   │ 4, 3 ✓              │  │
│ │ 1B     │ 100   │ 2 ✓                  │  │
│ │ 2B     │ 100   │ 1 ✓                  │  │
│ │ 3B     │ 100   │ 2 ✓                  │  │
│ │ 4B     │ 100   │ 4, 3 ✓              │  │
│ └────────┴───────┴──────────────────────┘  │
│                                             │
│ Segment 2 (30 min)                          │
│ ...                                         │
│                                             │
│ Session Notes                               │
│ ┌───────────────────────────────────────┐  │
│ │ Focused on keeping ostinato steady... │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### Display conventions for attempts:

- Numbers are mistake counts per attempt, comma-separated
- ✓ after the last number means the ostinato was passed (≤3 mistakes, no break)
- 🔴 or "broke" label for ostinato break attempts
- Bold/highlight the passing attempt

---

## Zustand Store

```typescript
// stores/sessionStore.ts
import { create } from 'zustand';
import type { Ostinato } from '../constants/curriculum';

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

	// Session lifecycle
	startSession: (curriculumItemId: string) => void;
	endSession: () => void;
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
	resetAttemptInputs: () => void;
}
```

---

## Key Business Logic

### Passing an Ostinato

An ostinato is "passed" for a given exercise when an attempt has:

- `mistakes <= 3` AND `ostinato_broke = false`

### Mastery Calculation

An exercise+ostinato combo is "mastered" when:

- Average mistakes across the last 10 attempts ≤ 1.0
- None of the last 10 attempts have `ostinato_broke = true`

```typescript
// db/queries.ts
async function getMasteryStatus(
	curriculumItemId: string,
	ostinato: string
): Promise<'not_started' | 'in_progress' | 'passed' | 'mastered'> {
	const last10 = await db.getAllAsync<Attempt>(
		`SELECT mistakes, ostinato_broke FROM attempts
     WHERE curriculum_item_id = ? AND ostinato = ?
     ORDER BY created_at DESC LIMIT 10`,
		[curriculumItemId, ostinato]
	);

	if (last10.length === 0) return 'not_started';

	const hasPassing = last10.some((a) => a.mistakes <= 3 && !a.ostinato_broke);
	if (!hasPassing) return 'in_progress';

	if (last10.length >= 10) {
		const avgMistakes = last10.reduce((sum, a) => sum + a.mistakes, 0) / 10;
		const noBreaks = last10.every((a) => !a.ostinato_broke);
		if (avgMistakes <= 1.0 && noBreaks) return 'mastered';
	}

	return 'passed';
}
```

### Session Summary Stats

```typescript
async function getSessionSummary(sessionId: string) {
	return db.getFirstAsync(
		`
    SELECT
      COUNT(*) as total_attempts,
      ROUND(AVG(a.mistakes), 1) as avg_mistakes,
      MIN(a.tempo) as min_tempo,
      MAX(a.tempo) as max_tempo,
      SUM(CASE WHEN a.ostinato_broke THEN 1 ELSE 0 END) as total_breaks,
      COUNT(DISTINCT CASE WHEN a.mistakes <= 3 AND NOT a.ostinato_broke
            THEN a.ostinato END) as ostinatos_passed
    FROM attempts a
    JOIN session_segments ss ON a.session_segment_id = ss.id
    WHERE ss.session_id = ?
  `,
		[sessionId]
	);
}
```

---

## Phase 1 Milestones

### Milestone 1: Project Scaffolding

- [ ] Expo project setup with tabs layout
- [ ] SQLite database initialization and schema
- [ ] Seed curriculum data
- [ ] TypeScript types defined
- [ ] Theme constants (colors, spacing)

### Milestone 2: Core Logger

- [ ] Zustand session store
- [ ] Start/end session flow
- [ ] Ostinato selector grid with status indicators
- [ ] Tempo input (±5 buttons + direct entry)
- [ ] Mistake counter (±1 buttons)
- [ ] Ostinato broke toggle
- [ ] Log attempt button → saves to SQLite
- [ ] Attempt list for current ostinato
- [ ] Undo last attempt

### Milestone 3: Segments & Session Flow

- [ ] Start/end segment within a session
- [ ] Segment timer display
- [ ] Break prompt between segments
- [ ] Session summary on end
- [ ] Segment counter in header

### Milestone 4: History

- [ ] Session list (History tab)
- [ ] Session detail view with full attempt breakdown
- [ ] Basic stats per session (avg mistakes, tempo range, pass count)

### Milestone 5: Polish

- [ ] Auto-advance setting (optional)
- [ ] Haptic feedback on log attempt
- [ ] iPad landscape layout optimization
- [ ] Persistent last-used curriculum item and tempo
- [ ] Empty states and onboarding (first launch)

---

## Design Notes

### Color Palette Suggestion

- **Background**: Dark (easy on eyes in practice room lighting)
- **Primary accent**: Warm amber/gold (energy, rhythm)
- **Success**: Green for passed, gold for mastered
- **Danger**: Red for ostinato broke
- **Ostinato grid**: Subtle color coding — A variants one shade, B variants another

### Typography

- Large, readable numbers for mistake counts and tempo
- Monospace or tabular numbers for the attempt list
- Clear hierarchy: exercise name > ostinato > attempt data

### iPad Considerations

- Landscape: Logger on left, attempt history on right (split view)
- Portrait: Stacked layout as shown in wireframes
- Large touch targets (minimum 48pt) for drum-stick-adjacent fingers
- Consider "sweaty hands" — generous spacing between interactive elements

### ADHD-Friendly Design

- Minimal decisions per screen — the logger should feel like a conveyor belt
- Clear visual feedback on every action (haptics, color changes, checkmarks)
- Progress indicators that show "you're almost done with this segment"
- No distracting animations or unnecessary UI elements
- The ostinato grid acts as a visual checklist — satisfying to fill in
