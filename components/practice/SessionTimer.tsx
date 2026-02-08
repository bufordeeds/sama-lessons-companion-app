import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, fontSize } from '@/constants/theme';

interface SessionTimerProps {
  startedAt: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function SessionTimer({ startedAt }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    const update = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'SpaceMono',
  },
});
