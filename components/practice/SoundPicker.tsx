import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  View as RNView,
} from 'react-native';
import { Text } from '@/components/Themed';
import { metronome } from '@/services/MetronomeService';
import {
  METRONOME_SOUNDS,
  getSoundCategories,
  getSoundsForCategory,
  type MetronomeSound,
} from '@/constants/metronome';
import { setPreference } from '@/db/queries';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface SoundPickerProps {
  visible: boolean;
  onClose: () => void;
  currentSoundId: string;
  onSoundChange: (soundId: string) => void;
}

export function SoundPicker({
  visible,
  onClose,
  currentSoundId,
  onSoundChange,
}: SoundPickerProps) {
  const categories = getSoundCategories();

  const handleSelect = useCallback(
    async (sound: MetronomeSound) => {
      // Play preview
      await metronome.playPreview(sound.id);
      // Update service and persist
      await metronome.changeSound(sound.id);
      setPreference('metronome_sound', sound.id);
      onSoundChange(sound.id);
    },
    [onSoundChange],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <RNView style={styles.header}>
            <Text style={styles.title}>Metronome Sound</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </RNView>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {categories.map((category) => (
              <RNView key={category} style={styles.categorySection}>
                <Text style={styles.categoryLabel}>{category}</Text>
                {getSoundsForCategory(category).map((sound) => (
                  <Pressable
                    key={sound.id}
                    style={[
                      styles.soundRow,
                      currentSoundId === sound.id && styles.soundRowSelected,
                    ]}
                    onPress={() => handleSelect(sound)}
                  >
                    <Text
                      style={[
                        styles.soundName,
                        currentSoundId === sound.id && styles.soundNameSelected,
                      ]}
                    >
                      {sound.name}
                    </Text>
                    {currentSoundId === sound.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </RNView>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  doneText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  categorySection: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  soundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    marginBottom: 2,
  },
  soundRowSelected: {
    backgroundColor: colors.primaryDim,
  },
  soundName: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  soundNameSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  checkmark: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '700',
  },
});
