# Changelog

## [0.1.0] - 2025-02-10

First beta release for TestFlight.

### Features

- **Practice Logger**: Real-time session logging with curriculum item selection, ostinato grid, tempo/mistake tracking, segment flow with break screens, and undo support
- **Sheet Music Tab**: Dedicated Music tab for browsing and viewing sheet music with built-in metronome, notation rendering, and sound picker
- **Session History**: Chronological session list with detail views showing per-segment and per-ostinato breakdowns, notes editing, and video link support
- **Progress Dashboard**: Mastery grid (color-coded by status), tempo trend charts (overview + per-ostinato), streak counter, and 12-week practice calendar heatmap
- **Settings Screen**: Metronome sound selection, default tempo, haptics toggle, sync controls, CSV export, sign out, and app version display
- **Cloud Sync**: Supabase integration with Apple Sign-In, automatic sync on app foreground, debounced push after local mutations, and full pull/push cycle
- **Metronome**: 40+ click sounds across percussion, synth block, sine, square, tick, and weird categories with preview playback
- **CSV Export**: Export all practice attempts to CSV via system share sheet
- **iPad Optimized**: Landscape split-view for active sessions, large touch targets, always-dark UI theme
- **Haptics**: Configurable haptic feedback with per-preference toggle
- **Daily Quotes**: Motivational quotes from SAMA lessons on the practice idle screen
- **Curriculum Support**: Walking Beat, Eighth Note Exercises, Rhythm Series 1-3 Prep, Practice Pad Fundamentals, and Misc categories
- **Seed Data**: Pre-populated practice history from handwritten notes for continuity

### Technical

- Expo 54 + React Native 0.81 + TypeScript 5.9 (strict mode)
- Local-first architecture with expo-sqlite (sync API)
- Zustand state management
- File-based routing with Expo Router
- EAS Build configured for TestFlight distribution
