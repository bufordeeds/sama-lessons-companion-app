# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAMA Drum Practice is an iPad-first drum practice logging app built with Expo (React Native). It replaces handwritten practice notes with real-time session logging for students following the San Antonio Music Academy drum curriculum. The app is designed with ADHD-friendly principles: minimal friction, clear visual state, large touch targets.

## Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run on web (Metro bundler)
```

No linter, test runner, or build scripts are configured yet.

## Architecture

**Framework:** Expo 54 with React Native 0.81, TypeScript 5.9 (strict mode), React 19.

**Routing:** Expo Router (file-based). Routes live in `app/`. Tab navigation is defined in `app/(tabs)/_layout.tsx`. Typed routes are enabled (`experiments.typedRoutes` in app.json).

**Path alias:** `@/*` maps to the project root (configured in tsconfig.json).

**New Architecture:** Enabled (`newArchEnabled: true` in app.json).

**Current state:** Boilerplate Expo tabs template. No custom implementation yet — Phase 1 (Practice Logger MVP) is next.

## Phase 1 Planned Architecture (see `docs/phase-1.md`)

The specs are detailed and prescriptive. Follow them closely when implementing.

- **Storage:** Local-first with `expo-sqlite`. No Supabase until Phase 2+.
- **State management:** Zustand for active session state. SQLite for persistence.
- **Two tabs:** "Practice" (real-time logger) and "History" (past sessions).
- **Session detail:** Route at `app/session/[id].tsx`.
- **Source layout:** `db/` (schema, queries, seed), `stores/` (Zustand), `components/practice/` and `components/history/`, `types/`, `constants/`.

## Domain Model

The curriculum has a linear progression: Walking Beat → Rock Ostinatos → Eighth Note Exercises → Rhythm Series 1–10. Each exercise is played over 8 ostinato patterns (1A, 2A, 3A, 4A, 1B, 2B, 3B, 4B) for 32 measures each.

**Core data flow:** Practice Session → Session Segments → Attempts. An attempt records curriculum item, ostinato, tempo (BPM), mistake count, and whether the ostinato broke.

**Passing:** ≤3 mistakes AND ostinato didn't break. **Mastered:** Last 10 attempts average ≤1 mistake with no breaks.

## Key Documentation

- `docs/app-overview.md` — Vision, curriculum structure, mastery model, all-phases roadmap, data model
- `docs/phase-1.md` — Detailed Phase 1 spec: SQLite schema, seed data, screen wireframes, Zustand store interface, business logic, milestones, design notes
