export interface SheetMusicEntry {
  id: string;
  name: string;
  /** Linked curriculum item ID, or null for reference-only sheets */
  curriculumItemId: string | null;
  asset: number; // require() returns a number (asset ID)
}

export const SHEET_MUSIC: SheetMusicEntry[] = [
  {
    id: 'walking-beat',
    name: 'Walking Beat',
    curriculumItemId: 'walking-beat',
    asset: require('@/mxl/walking-beat.mxl'),
  },
  {
    id: 'rock-ostinatos',
    name: 'Rock Ostinatos',
    curriculumItemId: null,
    asset: require('@/mxl/rock-ostinatos.mxl'),
  },
  {
    id: 'eighth-note-exercises',
    name: 'Eighth Note Exercises',
    curriculumItemId: 'eighth-note-exercises',
    asset: require('@/mxl/eighth-note-exercises.mxl'),
  },
  {
    id: 'rhythm-series-1',
    name: 'Rhythm Series 1',
    curriculumItemId: 'rhythm-series-1',
    asset: require('@/mxl/rhythm-series-1.mxl'),
  },
  {
    id: 'rhythm-series-2',
    name: 'Rhythm Series 2',
    curriculumItemId: 'rhythm-series-2',
    asset: require('@/mxl/rhythm-series-2.mxl'),
  },
];

/** Get the sheet music entry for a curriculum item, or null */
export function getSheetForCurriculum(curriculumItemId: string): SheetMusicEntry | null {
  return SHEET_MUSIC.find((s) => s.curriculumItemId === curriculumItemId) ?? null;
}

/** Get a sheet music entry by its ID */
export function getSheetById(sheetId: string): SheetMusicEntry | null {
  return SHEET_MUSIC.find((s) => s.id === sheetId) ?? null;
}
