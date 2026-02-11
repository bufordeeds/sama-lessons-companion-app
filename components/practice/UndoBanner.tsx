import React, { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, Animated } from 'react-native';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface UndoBannerProps {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoBanner({ visible, onUndo, onDismiss }: UndoBannerProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 80,
          duration: 250,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onDismiss();
        });
      }, 5000);
    } else {
      Animated.timing(translateY, {
        toValue: 80,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>Attempt logged</Text>
      <Pressable style={styles.undoButton} onPress={onUndo}>
        <Text style={styles.undoText}>UNDO</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  undoButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  undoText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
});
