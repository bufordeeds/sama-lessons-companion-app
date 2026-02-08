import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize } from '@/constants/theme';

interface PracticeCalendarProps {
  practiceDays: string[]; // ISO date strings (YYYY-MM-DD)
}

const WEEKS_TO_SHOW = 12;
const CELL_SIZE = 12;
const CELL_GAP = 2;
const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''];

export function PracticeCalendar({ practiceDays }: PracticeCalendarProps) {
  const { grid, monthLabels, todayKey } = useMemo(() => {
    const daySet = new Set(practiceDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // Find the Monday of the current week
    const currentDay = today.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
    const endMonday = new Date(today);
    endMonday.setDate(today.getDate() - mondayOffset);

    // Go back WEEKS_TO_SHOW weeks
    const startDate = new Date(endMonday);
    startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW - 1) * 7);

    // Build grid: array of weeks, each week is 7 days (Mon-Sun)
    const weeks: { date: string; hasPractice: boolean; isToday: boolean; isFuture: boolean }[][] = [];
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const week: typeof weeks[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const month = cursor.getMonth();

        if (month !== lastMonth) {
          months.push({
            label: cursor.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: w,
          });
          lastMonth = month;
        }

        week.push({
          date: dateStr,
          hasPractice: daySet.has(dateStr),
          isToday: dateStr === todayStr,
          isFuture: cursor > today,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return { grid: weeks, monthLabels: months, todayKey: todayStr };
  }, [practiceDays]);

  return (
    <View style={styles.container}>
      {/* Month labels */}
      <View style={styles.monthRow}>
        <View style={styles.dayLabelSpacer} />
        {grid.map((_, weekIdx) => {
          const monthLabel = monthLabels.find((m) => m.weekIndex === weekIdx);
          return (
            <View key={weekIdx} style={styles.monthCell}>
              {monthLabel && (
                <Text style={styles.monthText}>{monthLabel.label}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Grid rows (Mon-Sun) */}
      {Array.from({ length: 7 }).map((_, dayIdx) => (
        <View key={dayIdx} style={styles.gridRow}>
          <View style={styles.dayLabelContainer}>
            <Text style={styles.dayLabel}>{DAY_LABELS[dayIdx]}</Text>
          </View>
          {grid.map((week, weekIdx) => {
            const cell = week[dayIdx];
            return (
              <View
                key={weekIdx}
                style={[
                  styles.cell,
                  cell.hasPractice && styles.cellActive,
                  cell.isToday && styles.cellToday,
                  cell.isFuture && styles.cellFuture,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: CELL_GAP,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayLabelSpacer: {
    width: 16,
    marginRight: CELL_GAP,
  },
  monthCell: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
  },
  monthText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  dayLabelContainer: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
  },
  cellActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.white,
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
});
