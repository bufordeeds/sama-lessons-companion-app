import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const [subdivision, setSubdivision] = useState<1 | 2>(1);
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
      metronome.setSubdivision(subdivision);
      metronome.start(tempo, (beat) => {
        const totalClicks = 4 * subdivision;
        setCurrentBeat(beat % totalClicks);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, tempo, subdivision]);

  const handleMuteToggle = useCallback(() => {
    const muted = metronome.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleSubdivisionToggle = useCallback(() => {
    const next: 1 | 2 = subdivision === 1 ? 2 : 1;
    setSubdivision(next);
    metronome.setSubdivision(next);
    setCurrentBeat(-1);
  }, [subdivision]);

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
        {Array.from({ length: 4 * subdivision }, (_, i) => {
          const isDownbeat = i % subdivision === 0;
          const isFirst = i === 0;
          const isActive = currentBeat === i;
          return (
            <RNView
              key={i}
              style={[
                isDownbeat ? styles.beatDot : styles.beatDotSmall,
                isActive && (isFirst ? styles.beatDotAccent : styles.beatDotActive),
              ]}
            />
          );
        })}
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
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={colors.background}
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        </Pressable>

        {/* Subdivision + Mute + Settings */}
        <RNView style={styles.rightControls}>
          <Pressable
            style={[styles.subdivButton, subdivision === 2 && styles.subdivButtonActive]}
            onPress={handleSubdivisionToggle}
          >
            <Text style={[styles.subdivText, subdivision === 2 && styles.subdivTextActive]}>
              1/8
            </Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={handleMuteToggle}>
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color={isMuted ? colors.textMuted : colors.textSecondary}
            />
          </Pressable>
          {onOpenSoundPicker && (
            <Pressable style={styles.iconButton} onPress={onOpenSoundPicker}>
              <Ionicons name="settings-sharp" size={20} color={colors.textSecondary} />
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
  beatDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    flex: 1,
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
  rightControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  subdivButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subdivButtonActive: {
    backgroundColor: colors.primaryDim,
  },
  subdivText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  subdivTextActive: {
    color: colors.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
