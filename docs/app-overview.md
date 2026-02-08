# SAMA Drum Practice — App Overview

## Vision

A drum practice logging and progression tracking app built for students following a structured curriculum (initially modeled on the San Antonio Music Academy approach). The app replaces handwritten practice notes with real-time session logging, PDF sheet music viewing, and progress analytics — all optimized for iPad use during practice.

## Target User

Drum students following a teacher-led curriculum with structured exercises, ostinato patterns, and progressive rhythm series. Primary user: Buford (ADHD-aware design considerations for focus and simplicity during practice). Future users: other SAMA students, potentially any drum student following a similar pedagogical approach.

---

## Curriculum Structure

The app models a linear progression through a drum curriculum:

```
Walking Beat (fundamentals)
  → Rock Ostinatos (4 base patterns)
    → Eighth Note Rhythm Exercises
      → Rhythm Series 1–10 (progressive complexity)
```

### Ostinato System

There are 4 base ostinato patterns, each with an A and B variation:

| #   | Ride                 | Hi-Hat               |
| --- | -------------------- | -------------------- |
| 1   | Eighth notes         | Quarters on downbeat |
| 2   | Eighth notes         | Quarters on upbeat   |
| 3   | Quarters on downbeat | Eighth notes         |
| 4   | Quarters on upbeat   | Eighth notes         |

**A Variations**: Add kick drum on beats 1 and 3
**B Variations**: Add snare drum on beats 2 and 4

For each Rhythm Series, exercises are played over all 8 ostinatos (1A, 2A, 3A, 4A, 1B, 2B, 3B, 4B). Each exercise is 32 measures per ostinato.

### Mastery Model

- **Passing threshold**: 3 or fewer mistakes on a single attempt (teacher's standard for progression)
- **Mastered**: Average of last 10 attempts ≤ 1 mistake
- **Ostinato break**: A distinct (and more severe) failure mode where the underlying ostinato pattern falls apart — tracked separately from rhythm exercise mistakes

### Tempo Progression

- No prescribed target tempo — comfort is the goal
- Typical learning range: start at 70–80 BPM, comfortable at ~100, push to ~130
- Tempo is logged per attempt, enabling progression tracking over time

---

## App Phases

### Phase 1: Practice Logger (MVP)

Real-time session logging that replaces handwritten notes. Core data capture for all future features.

### Phase 2: Progress Dashboard

Visualizations showing improvement over time: mistake trends, tempo progression, mastery status per ostinato, session consistency streaks.

### Phase 3: Sheet Music Viewer

Upload and display PDF sheet music from MuseScore. Associate PDFs with specific exercises/series. Optimized for iPad landscape viewing.

### Phase 4: Curriculum Management

Full curriculum tree navigation. Teacher-defined progression paths. Exercise metadata and descriptions. Potential for teacher accounts to manage student progress.

### Phase 5: SAMA Integration (Stretch)

Multi-student support. Teacher dashboard. Shared curriculum definitions. Assignment tracking.

---

## Tech Stack

| Layer       | Choice                                   | Rationale                                                  |
| ----------- | ---------------------------------------- | ---------------------------------------------------------- |
| Framework   | Expo (React Native)                      | Cross-platform, iPad-native, Buford's primary mobile stack |
| Navigation  | Expo Router                              | File-based routing, familiar pattern                       |
| Backend     | Supabase                                 | Auth, Postgres DB, file storage (PDFs), real-time sync     |
| State       | Zustand or React Context                 | Lightweight, minimal boilerplate                           |
| PDF Viewing | react-native-pdf                         | Phase 3, iPad-optimized                                    |
| Charts      | Victory Native or react-native-chart-kit | Phase 2 dashboard                                          |
| Hosting     | Supabase (backend), Expo EAS (builds)    | Familiar deployment pipeline                               |

---

## Data Model (High Level)

```
curriculum_items
  - id, name, type (walking_beat | ostinato | rhythm_series),
  - order, parent_id, description

exercises
  - id, curriculum_item_id, ostinato (1A-4B), measure_count
  - sheet_music_url (nullable, Phase 3)

practice_sessions
  - id, user_id, started_at, ended_at, notes
  - goal_structure (e.g., "4x30min with 30min breaks")

session_segments
  - id, session_id, segment_number, started_at, ended_at

attempts
  - id, session_segment_id, exercise_id
  - tempo, mistakes, ostinato_broke (boolean)
  - notes, created_at

user_progress
  - user_id, exercise_id
  - status (not_started | in_progress | passed | mastered)
  - best_tempo, avg_mistakes_last_10
```

---

## Design Principles

1. **Minimal friction during practice** — logging must be fast, one-handed, interruptible
2. **ADHD-friendly** — clear visual state, minimal decisions, obvious "what do I do next"
3. **iPad-first layout** — landscape orientation, large touch targets, split-view friendly
4. **Data richness** — capture everything now, visualize later
5. **Offline-capable** — log locally, sync when connected (nice-to-have, not critical for MVP)

---

## Key Screens (All Phases)

1. **Home / Today** — Current session status, quick-start practice, streak info
2. **Practice Logger** — The core real-time logging interface (Phase 1)
3. **Progress** — Charts, mastery grid, tempo trends (Phase 2)
4. **Sheet Music** — PDF library and viewer (Phase 3)
5. **Curriculum** — Browse exercises, see progression (Phase 4)
6. **Settings** — Profile, practice goals, metronome preferences
