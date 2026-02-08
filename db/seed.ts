import type { SQLiteDatabase } from 'expo-sqlite';
import { CURRICULUM_ITEMS } from '@/constants/curriculum';

export function seedCurriculumData(db: SQLiteDatabase): void {
  const stmt = db.prepareSync(
    `INSERT OR IGNORE INTO curriculum_items (id, name, type, series_number, description, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  try {
    for (const item of CURRICULUM_ITEMS) {
      stmt.executeSync(
        item.id,
        item.name,
        item.type,
        item.series_number,
        item.description,
        item.sort_order,
      );
    }
  } finally {
    stmt.finalizeSync();
  }
}
