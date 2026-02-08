import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing } from '@/constants/theme';

interface PracticeCalendarProps {
  practiceDays: string[]; // ISO date strings (YYYY-MM-DD)
}

const CELL_GAP = 3;
const DAY_LABEL_WIDTH = 14;
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function PracticeCalendar({ practiceDays }: PracticeCalendarProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Available width: screen - scrollView padding (lg*2) - DashboardSection padding (lg*2) - day labels - gap
  const availableWidth =
    screenWidth - spacing.lg * 4 - DAY_LABEL_WIDTH - CELL_GAP;

  // Calculate cell size to fit 52 weeks, with a floor
  const targetWeeks = 52;
  const cellSize = Math.max(
    6,
    Math.floor((availableWidth - (targetWeeks - 1) * CELL_GAP) / targetWeeks),
  );
  // Recalculate actual weeks that fit at this cell size
  const weeksToShow = Math.min(
    targetWeeks,
    Math.floor((availableWidth + CELL_GAP) / (cellSize + CELL_GAP)),
  );
  // Exact width the grid will occupy
  const gridWidth = weeksToShow * (cellSize + CELL_GAP) - CELL_GAP;

  const { grid, monthLabels } = useMemo(() => {
    const daySet = new Set(practiceDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
    const endMonday = new Date(today);
    endMonday.setDate(today.getDate() - mondayOffset);

    const startDate = new Date(endMonday);
    startDate.setDate(startDate.getDate() - (weeksToShow - 1) * 7);

    const weeks: {
      date: string;
      hasPractice: boolean;
      isToday: boolean;
      isFuture: boolean;
    }[][] = [];
    const months: { label: string; xOffset: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    for (let w = 0; w < weeksToShow; w++) {
      const week: (typeof weeks)[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const month = cursor.getMonth();

        if (d === 0 && month !== lastMonth) {
          months.push({
            label: cursor.toLocaleDateString('en-US', { month: 'short' }),
            xOffset: w * (cellSize + CELL_GAP),
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

    return { grid: weeks, monthLabels: months };
  }, [practiceDays, weeksToShow, cellSize]);

  return (
    <View style={styles.container}>
      {/* Month labels — positioned absolutely to avoid line-break */}
      <View style={[styles.monthRow, { marginLeft: DAY_LABEL_WIDTH + CELL_GAP }]}>
        <View style={{ width: gridWidth, height: 14 }}>
          {monthLabels.map((m, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={[styles.monthText, { position: 'absolute', left: m.xOffset }]}
            >
              {m.label}
            </Text>
          ))}
        </View>
      </View>

      {/* Grid rows (Mon–Sun) */}
      {Array.from({ length: 7 }).map((_, dayIdx) => (
        <View key={dayIdx} style={styles.gridRow}>
          <View style={[styles.dayLabelContainer, { width: DAY_LABEL_WIDTH }]}>
            <Text style={styles.dayLabel}>{DAY_LABELS[dayIdx]}</Text>
          </View>
          <View style={styles.cellRow}>
            {grid.map((week, weekIdx) => {
              const cell = week[dayIdx];
              return (
                <View
                  key={weekIdx}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 2,
                    backgroundColor: cell.isFuture
                      ? 'transparent'
                      : cell.hasPractice
                        ? '#2E7D32'
                        : colors.surfaceLight,
                    borderWidth: cell.isToday ? 1 : 0,
                    borderColor: cell.isToday ? colors.white : 'transparent',
                  }}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    gap: CELL_GAP,
  },
  monthRow: {
    marginBottom: 2,
  },
  monthText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CELL_GAP,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cellRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
});
