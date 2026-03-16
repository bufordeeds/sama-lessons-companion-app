import type { SQLiteDatabase } from 'expo-sqlite';
import { CURRICULUM_ITEMS } from '@/constants/curriculum';

export async function seedCurriculumData(db: SQLiteDatabase): Promise<void> {
  for (const item of CURRICULUM_ITEMS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO curriculum_items (id, name, type, series_number, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      item.id,
      item.name,
      item.type,
      item.series_number,
      item.description,
      item.sort_order,
    );
  }
}
