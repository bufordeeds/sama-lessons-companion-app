import React, { useState, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { ALL_OSTINATOS, type Ostinato } from '@/constants/curriculum';
import { ChartToggle } from './ChartToggle';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

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
        <OverviewSummary data={aggregateData} />
      ) : (
        <OstinatoSummary data={ostinatoData} />
      )}
    </View>
  );
}

function OverviewSummary({ data }: { data: AggregateEntry[] }) {
  const first = data[0];
  const last = data[data.length - 1];
  const overall = useMemo(() => {
    const avg = Math.round(data.reduce((s, d) => s + d.avgTempo, 0) / data.length);
    const min = Math.min(...data.map((d) => d.minTempo));
    const max = Math.max(...data.map((d) => d.maxTempo));
    return { avg, min, max };
  }, [data]);

  const trend = last.avgTempo - first.avgTempo;
  const trendLabel = trend > 0 ? `+${Math.round(trend)}` : `${Math.round(trend)}`;
  const trendColor = trend >= 0 ? colors.success : colors.danger;

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <StatBlock label="Avg Tempo" value={`${overall.avg}`} />
        <StatBlock label="Range" value={`${overall.min}–${overall.max}`} />
        <StatBlock label="Trend" value={trendLabel} valueColor={trendColor} />
      </View>
      <View style={styles.barContainer}>
        {data.slice(-12).map((d, i) => {
          const minT = Math.min(...data.slice(-12).map((e) => e.avgTempo));
          const maxT = Math.max(...data.slice(-12).map((e) => e.avgTempo));
          const range = maxT - minT || 1;
          const height = 20 + ((d.avgTempo - minT) / range) * 60;
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={[styles.bar, { height }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>{formatDate(data[Math.max(0, data.length - 12)].date)}</Text>
        <Text style={styles.dateLabel}>{formatDate(last.date)}</Text>
      </View>
    </View>
  );
}

function OstinatoSummary({ data }: { data: TempoEntry[] }) {
  const byOstinato = useMemo(() => {
    const map = new Map<Ostinato, { tempos: number[]; latest: number }>();
    for (const entry of data) {
      const existing = map.get(entry.ostinato);
      if (existing) {
        existing.tempos.push(entry.tempo);
        existing.latest = entry.tempo;
      } else {
        map.set(entry.ostinato, { tempos: [entry.tempo], latest: entry.tempo });
      }
    }
    return map;
  }, [data]);

  const activeOstinatos = ALL_OSTINATOS.filter((ost) => byOstinato.has(ost));

  if (activeOstinatos.length === 0) {
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.placeholder}>Not enough data for per-ostinato view</Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryCard}>
      {activeOstinatos.map((ost) => {
        const info = byOstinato.get(ost)!;
        const avg = Math.round(info.tempos.reduce((s, t) => s + t, 0) / info.tempos.length);
        const min = Math.min(...info.tempos);
        const max = Math.max(...info.tempos);
        return (
          <View key={ost} style={styles.ostinatoRow}>
            <Text style={styles.ostinatoLabel}>{ost}</Text>
            <Text style={styles.ostinatoStat}>avg {avg}</Text>
            <Text style={styles.ostinatoRange}>{min}–{max}</Text>
            <Text style={styles.ostinatoLatest}>latest {info.latest}</Text>
          </View>
        );
      })}
    </View>
  );
}

function StatBlock({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 2,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '80%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    minHeight: 4,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ostinatoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ostinatoLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
    width: 32,
  },
  ostinatoStat: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  ostinatoRange: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  ostinatoLatest: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  placeholder: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
