import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system/next';
import { getDb } from '@/db/queries';

export async function exportSessionsCsv(): Promise<void> {
  const rows = getDb().getAllSync<{
    date: string;
    session_id: string;
    curriculum_item: string;
    segment: number;
    ostinato: string;
    tempo: number;
    mistakes: number;
    broke: number;
    passed: number;
  }>(
    `SELECT
       date(ps.started_at, 'localtime') as date,
       ps.id as session_id,
       ci.name as curriculum_item,
       ss.segment_number as segment,
       a.ostinato,
       a.tempo,
       a.mistakes,
       a.ostinato_broke as broke,
       CASE WHEN a.mistakes <= 3 AND a.ostinato_broke = 0 THEN 1 ELSE 0 END as passed
     FROM attempts a
     JOIN session_segments ss ON a.session_segment_id = ss.id
     JOIN practice_sessions ps ON ss.session_id = ps.id
     LEFT JOIN curriculum_items ci ON ci.id = a.curriculum_item_id
     WHERE a.deleted_at IS NULL AND ss.deleted_at IS NULL AND ps.deleted_at IS NULL
     ORDER BY ps.started_at, ss.segment_number, a.created_at`,
  );

  const header = 'date,session_id,curriculum_item,segment,ostinato,tempo,mistakes,broke,passed';
  const csvRows = rows.map(
    (r) =>
      `${r.date},${r.session_id},"${(r.curriculum_item ?? '').replace(/"/g, '""')}",${r.segment},${r.ostinato},${r.tempo},${r.mistakes},${r.broke},${r.passed}`,
  );
  const csv = [header, ...csvRows].join('\n');

  const file = new File(Paths.cache, 'sama-practice-export.csv');
  file.write(csv);

  await Share.share({ url: file.uri, title: 'SAMA Practice Export' });
}
