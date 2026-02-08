# Achievement System

## Overview

A repeatable achievement system inspired by Apple Fitness awards. Achievements celebrate milestones and encourage consistent, high-quality practice. Unlike one-time badges, achievements can be earned multiple times — each earn increments a counter and records the date, while preserving when the achievement was first collected.

## Core Concepts

### Repeatable Awards

Every achievement can be earned more than once. The system tracks:

- **`first_earned_at`** — Date the achievement was first collected
- **`last_earned_at`** — Date of the most recent earn
- **`earn_count`** — Total number of times earned
- **`earn_history`** — Array of dates for each individual earn

This means "Clean Sweep" isn't a one-time badge — you earn it every time you pass all 8 ostinatos in a single session. Seeing "Clean Sweep ×12" feels rewarding and shows progress over time.

### Achievement Check Triggers

Achievements are evaluated at specific moments:

- **After logging an attempt** — per-attempt achievements (first pass, low mistakes)
- **After ending a segment** — segment-level achievements
- **After ending a session** — session-level achievements (clean sweep, endurance)
- **On app open / daily** — streak-based and calendar-based achievements

### Notification

When an achievement is earned, show a brief celebratory banner (slide down from top, auto-dismiss after 3 seconds). Include the achievement icon, name, and earn count if > 1. Optional haptic feedback (notification style).

---

## Achievement Categories

### Milestones

| Achievement | Condition | Repeatable? |
|---|---|---|
| **First Steps** | Log your first attempt ever | No (one-time) |
| **First Pass** | Pass an ostinato for the first time (≤3 mistakes, no break) | Per ostinato per curriculum item |
| **First Mastery** | Master an ostinato for the first time (last 10 avg ≤1, no breaks) | Per ostinato per curriculum item |
| **New Territory** | Start practicing a new curriculum item | Per curriculum item |

### Session Performance

| Achievement | Condition | Repeatable? |
|---|---|---|
| **Clean Sweep** | Pass all 8 ostinatos in a single session | Yes, per session |
| **Flawless** | Log an attempt with 0 mistakes | Yes, per attempt |
| **Flawless Run** | Pass all 8 ostinatos with 0 mistakes in one session | Yes, per session |
| **Unbreakable** | Complete an entire session with no ostinato breaks | Yes, per session |
| **Double Down** | Log 2 segments in one session | Yes, per session |
| **Marathon** | Log 4+ segments in one session | Yes, per session |

### Tempo

| Achievement | Condition | Repeatable? |
|---|---|---|
| **Speed Up** | Pass an ostinato at a higher tempo than your previous pass | Yes |
| **Century Club** | Pass an ostinato at 100+ BPM | Per ostinato per curriculum item |
| **Speed Demon** | Pass an ostinato at 120+ BPM | Per ostinato per curriculum item |
| **Blazing** | Pass an ostinato at 140+ BPM | Per ostinato per curriculum item |

### Consistency (Streak-based)

| Achievement | Condition | Repeatable? |
|---|---|---|
| **Getting Started** | Practice 3 days in a row | Yes, each time streak hits 3 |
| **Building Habit** | Practice 7 days in a row | Yes, each time streak hits 7 |
| **Dedicated** | Practice 14 days in a row | Yes |
| **Iron Will** | Practice 30 days in a row | Yes |
| **Practice Machine** | Practice 100 days in a row | Yes |

### Volume

| Achievement | Condition | Repeatable? |
|---|---|---|
| **Warming Up** | Log 10 total attempts | No |
| **Getting Serious** | Log 100 total attempts | No |
| **Veteran** | Log 500 total attempts | No |
| **Thousand Club** | Log 1,000 total attempts | No |
| **10 Sessions** | Complete 10 sessions | No |
| **50 Sessions** | Complete 50 sessions | No |

### Improvement

| Achievement | Condition | Repeatable? |
|---|---|---|
| **Comeback** | After a session with avg mistakes > 3, log a session with avg < 2 | Yes |
| **Personal Best** | Set a new highest passing tempo for any ostinato | Yes |
| **Level Up** | Master all 8 ostinatos in a curriculum item | Per curriculum item |

---

## Data Model

### SQLite Table: `achievements`

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,                    -- e.g. 'clean_sweep', 'speed_demon'
  curriculum_item_id TEXT,              -- NULL for global achievements
  ostinato TEXT,                        -- NULL for non-ostinato-specific achievements
  first_earned_at TEXT NOT NULL,        -- ISO timestamp
  last_earned_at TEXT NOT NULL,         -- ISO timestamp
  earn_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(key, curriculum_item_id, ostinato)
);
```

### SQLite Table: `achievement_history`

```sql
CREATE TABLE IF NOT EXISTS achievement_history (
  id TEXT PRIMARY KEY,
  achievement_key TEXT NOT NULL,
  curriculum_item_id TEXT,
  ostinato TEXT,
  earned_at TEXT NOT NULL,              -- ISO timestamp
  session_id TEXT,                      -- which session triggered it (NULL for streak-based)
  metadata TEXT                         -- JSON blob for context (e.g. {"tempo": 120, "mistakes": 0})
);
```

### Achievement Definition (TypeScript)

```typescript
interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;               // emoji or icon name
  category: 'milestone' | 'performance' | 'tempo' | 'consistency' | 'volume' | 'improvement';
  scope: 'global' | 'per_curriculum' | 'per_ostinato';
  repeatable: boolean;
  check: (context: AchievementContext) => boolean;
}

interface AchievementContext {
  sessionId?: string;
  segmentId?: string;
  attemptId?: string;
  curriculumItemId?: string;
  ostinato?: Ostinato;
  tempo?: number;
  mistakes?: number;
  ostinatoBroke?: boolean;
  // Aggregates available for session-level checks
  sessionAttempts?: AttemptRow[];
  currentStreak?: number;
  totalAttempts?: number;
  totalSessions?: number;
}

interface EarnedAchievement {
  key: string;
  name: string;
  icon: string;
  earnCount: number;
  firstEarnedAt: string;
  lastEarnedAt: string;
}
```

---

## UI Components

### Achievement Banner (notification)

Slides down from top when earned. Shows:
- Icon (left)
- Achievement name + "×{count}" if earned before (center)
- Brief description (subtitle)
- Auto-dismisses after 3s, or tap to dismiss

### Achievements Section (Progress tab)

Add as a new DashboardSection on the Progress tab:
- Grid of earned achievement icons with earn count badges
- Tap an achievement to see detail: name, description, earn count, first/last earned dates, history
- Unearned achievements shown as locked (dimmed, silhouette icon)
- Category filter pills: All, Milestones, Performance, Tempo, Consistency, Volume, Improvement

### Achievement Detail Modal

- Large icon
- Name + description
- "Earned {count} times"
- "First earned: {date}" / "Last earned: {date}"
- Scrollable history of each earn with context (tempo, session date, etc.)

---

## Implementation Notes

- Achievement checking should be lightweight — run synchronously after the triggering action
- Cache current earn state in memory (Map) to avoid DB reads on every check
- Streak achievements: check on app open and after session end
- Volume achievements: check after each attempt/session
- The `metadata` JSON field in history allows storing context without schema changes (tempo for speed achievements, mistake count for flawless, etc.)
- Achievement definitions live in a `constants/achievements.ts` file — easy to add new ones without DB changes
- Consider a `useAchievements` hook that provides check functions and the banner trigger

---

## Future Ideas

- **Sharing**: Share achievement screenshots (like Apple Fitness)
- **Weekly/Monthly challenges**: Time-limited special achievements
- **Teacher-assigned goals**: Teacher sets target achievements for the week
- **Sound effects**: Optional celebration sounds on earn
- **Achievement streaks**: Earn the same achievement N times in a row
