import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface UndoBannerProps {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoBanner({ visible, onUndo, onDismiss }: UndoBannerProps) {
  const translateY = useSharedValue(80);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 250 });
      // Auto-dismiss after 5 seconds
      translateY.value = withDelay(
        5000,
        withTiming(80, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        }),
      );
    } else {
      translateY.value = withTiming(80, { duration: 250 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
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
