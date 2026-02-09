import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { metronome } from '@/services/MetronomeService';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface MetronomeBarProps {
  tempo: number;
  onTempoChange?: (tempo: number) => void;
  onOpenSoundPicker?: () => void;
}

export function MetronomeBar({ tempo, onTempoChange, onOpenSoundPicker }: MetronomeBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const initRef = useRef(false);

  // Sync tempo changes to the running metronome
  useEffect(() => {
    if (isPlaying) {
      metronome.setTempo(tempo);
    }
  }, [tempo, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      metronome.stop();
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      metronome.stop();
      setIsPlaying(false);
      setCurrentBeat(-1);
    } else {
      if (!initRef.current) {
        await metronome.initialize();
        initRef.current = true;
      }
      metronome.start(tempo, (beat) => {
        setCurrentBeat(beat % 4);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, tempo]);

  const handleMuteToggle = useCallback(() => {
    const muted = metronome.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleTempoAdjust = useCallback(
    (delta: number) => {
      const newTempo = Math.max(40, Math.min(300, tempo + delta));
      onTempoChange?.(newTempo);
    },
    [tempo, onTempoChange],
  );

  return (
    <RNView style={styles.container}>
      {/* Beat indicator */}
      <RNView style={styles.beatRow}>
        {[0, 1, 2, 3].map((i) => (
          <RNView
            key={i}
            style={[
              styles.beatDot,
              currentBeat === i && (i === 0 ? styles.beatDotAccent : styles.beatDotActive),
            ]}
          />
        ))}
      </RNView>

      <RNView style={styles.controlsRow}>
        {/* Tempo controls */}
        <RNView style={styles.tempoSection}>
          <Pressable
            style={styles.tempoButton}
            onPress={() => handleTempoAdjust(-5)}
          >
            <Text style={styles.tempoButtonText}>-5</Text>
          </Pressable>
          <RNView style={styles.tempoDisplay}>
            <Text style={styles.tempoValue}>{tempo}</Text>
            <Text style={styles.tempoLabel}>BPM</Text>
          </RNView>
          <Pressable
            style={styles.tempoButton}
            onPress={() => handleTempoAdjust(5)}
          >
            <Text style={styles.tempoButtonText}>+5</Text>
          </Pressable>
        </RNView>

        {/* Play/Pause */}
        <Pressable
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={handlePlayPause}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </Pressable>

        {/* Mute + Settings */}
        <RNView style={styles.rightControls}>
          <Pressable style={styles.iconButton} onPress={handleMuteToggle}>
            <Text style={[styles.iconText, isMuted && styles.iconTextMuted]}>
              {isMuted ? '🔇' : '🔊'}
            </Text>
          </Pressable>
          {onOpenSoundPicker && (
            <Pressable style={styles.iconButton} onPress={onOpenSoundPicker}>
              <Text style={styles.iconText}>⚙</Text>
            </Pressable>
          )}
        </RNView>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  beatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  beatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
  },
  beatDotActive: {
    backgroundColor: colors.textSecondary,
  },
  beatDotAccent: {
    backgroundColor: colors.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tempoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tempoButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempoButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tempoDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  tempoValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  tempoLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  playButton: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    borderRadius: touchTarget.comfortable / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primaryDim,
  },
  playButtonText: {
    fontSize: fontSize.xl,
  },
  rightControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: fontSize.lg,
  },
  iconTextMuted: {
    opacity: 0.5,
  },
});
