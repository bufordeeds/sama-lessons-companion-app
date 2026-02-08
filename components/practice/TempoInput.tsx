import React, { useState } from 'react';
import { StyleSheet, Pressable, TextInput, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface TempoInputProps {
  tempo: number;
  onAdjust: (delta: number) => void;
  onSet: (tempo: number) => void;
}

export function TempoInput({ tempo, onAdjust, onSet }: TempoInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = () => {
    setEditValue(String(tempo));
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onSet(parsed);
    }
    setIsEditing(false);
  };

  return (
    <RNView style={styles.container}>
      <Text style={styles.label}>Tempo</Text>
      <RNView style={styles.inputRow}>
        <Pressable style={styles.button} onPress={() => onAdjust(-5)}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        {isEditing ? (
          <TextInput
            style={styles.tempoInput}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={handleEndEdit}
            onSubmitEditing={handleEndEdit}
            keyboardType="number-pad"
            selectTextOnFocus
            autoFocus
          />
        ) : (
          <Pressable onPress={handleStartEdit}>
            <Text style={styles.tempoDisplay}>{tempo}</Text>
          </Pressable>
        )}
        <Pressable style={styles.button} onPress={() => onAdjust(5)}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: '600',
  },
  tempoDisplay: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 80,
    textAlign: 'center',
  },
  tempoInput: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 80,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.xs,
  },
});
