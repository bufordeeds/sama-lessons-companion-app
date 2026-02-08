export const CURRICULUM_ITEMS = [
  {
    id: 'walking-beat',
    name: 'Walking Beat',
    type: 'fundamentals' as const,
    series_number: null,
    description:
      'Kick on downbeats, hi-hat pedal on upbeats. 4 sixteenth notes on snare and 3 toms per beat.',
    sort_order: 1,
  },
  {
    id: 'eighth-note-exercises',
    name: 'Eighth Note Rhythm Exercises',
    type: 'fundamentals' as const,
    series_number: null,
    description:
      'Various eighth note kick and snare patterns over rock ostinatos.',
    sort_order: 2,
  },
  {
    id: 'rhythm-series-1',
    name: 'Rhythm Series 1',
    type: 'rhythm_series' as const,
    series_number: 1,
    description:
      '32 measures of quarter notes and rests. A ostinatos: snare plays quarters. B ostinatos: kick plays quarters.',
    sort_order: 3,
  },
  {
    id: 'rhythm-series-2',
    name: 'Rhythm Series 2',
    type: 'rhythm_series' as const,
    series_number: 2,
    description:
      '32 measures mixing eighth notes, quarter notes, and rests.',
    sort_order: 4,
  },
] as const;

export const OSTINATOS = [
  '1A',
  '2A',
  '3A',
  '4A',
  '1B',
  '2B',
  '3B',
  '4B',
] as const;

export type Ostinato = (typeof OSTINATOS)[number];

export const OSTINATO_DESCRIPTIONS: Record<Ostinato, string> = {
  '1A': 'Ride 8ths, HH \u2193, Kick 1&3',
  '2A': 'Ride 8ths, HH \u2191, Kick 1&3',
  '3A': 'Ride \u2193, HH 8ths, Kick 1&3',
  '4A': 'Ride \u2191, HH 8ths, Kick 1&3',
  '1B': 'Ride 8ths, HH \u2193, Snare 2&4',
  '2B': 'Ride 8ths, HH \u2191, Snare 2&4',
  '3B': 'Ride \u2193, HH 8ths, Snare 2&4',
  '4B': 'Ride \u2191, HH 8ths, Snare 2&4',
};
