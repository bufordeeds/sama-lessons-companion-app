import React, { useState, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { CartesianChart, Line, Area, Scatter } from 'victory-native';
import { ALL_OSTINATOS, type Ostinato } from '@/constants/curriculum';
import { ChartToggle } from './ChartToggle';
import { colors, spacing, fontSize } from '@/constants/theme';

interface AggregateEntry {
  date: string;
  avgTempo: number;
  minTempo: number;
  maxTempo: number;
}

interface TempoEntry {
  ostinato: Ostinato;
  tempo: number;
  date: string;
  passed: boolean;
}

interface TempoChartProps {
  aggregateData: AggregateEntry[];
  ostinatoData: TempoEntry[];
}

const OSTINATO_COLORS: Partial<Record<Ostinato, string>> = {
  '1': '#FF6B6B',
  '2': '#FFB347',
  '3': '#87CEEB',
  '4': '#98FB98',
  '1A': '#FF6B6B',
  '2A': '#FFB347',
  '3A': '#87CEEB',
  '4A': '#98FB98',
  '1B': '#DDA0DD',
  '2B': '#F0E68C',
  '3B': '#B0C4DE',
  '4B': '#FFA07A',
};

export function TempoChart({ aggregateData, ostinatoData }: TempoChartProps) {
  const [mode, setMode] = useState<'overview' | 'by-ostinato'>('overview');

  if (aggregateData.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>
          Log more sessions to see tempo trends
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChartToggle selected={mode} onSelect={setMode} />
      {mode === 'overview' ? (
        <OverviewChart data={aggregateData} />
      ) : (
        <OstinatoChart data={ostinatoData} />
      )}
    </View>
  );
}

function OverviewChart({ data }: { data: AggregateEntry[] }) {
  const chartData = useMemo(
    () =>
      data.map((d, i) => ({
        x: i,
        avgTempo: d.avgTempo,
        minTempo: d.minTempo,
        maxTempo: d.maxTempo,
        label: d.date,
      })),
    [data],
  );

  return (
    <View style={styles.chartContainer}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['avgTempo', 'minTempo', 'maxTempo']}
        padding={{ left: 0, right: 0, top: 10, bottom: 4 }}
        domainPadding={{ top: 10, bottom: 10 }}
      >
        {({ points, chartBounds }) => (
          <>
            <Area
              points={points.maxTempo}
              y0={chartBounds.bottom}
              color={`rgba(212, 168, 67, 0.15)`}
              curveType="monotoneX"
            />
            <Line
              points={points.avgTempo}
              color={colors.primary}
              strokeWidth={2}
              curveType="monotoneX"
            />
            <Scatter
              points={points.avgTempo}
              color={colors.primary}
              radius={3}
            />
          </>
        )}
      </CartesianChart>
      <TempoLabels data={data} />
    </View>
  );
}

function OstinatoChart({ data }: { data: TempoEntry[] }) {
  // Group by ostinato, compute per-date average
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number[]>>();
    for (const entry of data) {
      if (!byDate.has(entry.date)) byDate.set(entry.date, {});
      const dateMap = byDate.get(entry.date)!;
      if (!dateMap[entry.ostinato]) dateMap[entry.ostinato] = [];
      dateMap[entry.ostinato].push(entry.tempo);
    }

    const dates = Array.from(byDate.keys()).sort();
    return dates.map((date, i) => {
      const dateMap = byDate.get(date)!;
      const row: Record<string, number> = { x: i };
      for (const ost of ALL_OSTINATOS) {
        const tempos = dateMap[ost];
        row[ost] = tempos ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
      }
      return row;
    });
  }, [data]);

  // Find which ostinatos actually have data
  const activeOstinatos = useMemo(() => {
    return ALL_OSTINATOS.filter((ost) =>
      chartData.some((d) => (d[ost] as number) > 0),
    );
  }, [chartData]);

  if (chartData.length < 2) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.placeholder}>Not enough data for per-ostinato view</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={activeOstinatos as unknown as (keyof typeof chartData[0])[]}
        padding={{ left: 0, right: 0, top: 10, bottom: 4 }}
        domainPadding={{ top: 10, bottom: 10 }}
      >
        {({ points }) => (
          <>
            {activeOstinatos.map((ost) => (
              <Line
                key={ost}
                points={points[ost as keyof typeof points]}
                color={OSTINATO_COLORS[ost] ?? colors.textMuted}
                strokeWidth={2}
                curveType="monotoneX"
                connectMissingData
              />
            ))}
          </>
        )}
      </CartesianChart>
      <View style={styles.legend}>
        {activeOstinatos.map((ost) => (
          <View key={ost} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: OSTINATO_COLORS[ost] ?? colors.textMuted }]}
            />
            <Text style={styles.legendText}>{ost}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TempoLabels({ data }: { data: AggregateEntry[] }) {
  if (data.length === 0) return null;
  const first = data[0];
  const last = data[data.length - 1];

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.labelsRow}>
      <Text style={styles.axisLabel}>{formatDate(first.date)}</Text>
      <Text style={styles.axisLabel}>{formatDate(last.date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chartContainer: {
    height: 200,
  },
  placeholder: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
