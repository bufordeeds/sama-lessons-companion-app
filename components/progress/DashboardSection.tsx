import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface DashboardSectionProps {
  title: string;
  info?: string;
  children: React.ReactNode;
}

export function DashboardSection({ title, info, children }: DashboardSectionProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {info && (
          <Pressable
            onPress={() => setShowInfo(true)}
            hitSlop={12}
            style={styles.infoButton}
          >
            <FontAwesome name="info-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {children}

      {info && (
        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setShowInfo(false)}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipTitle}>{title}</Text>
              <Text style={styles.tooltipText}>{info}</Text>
              <Pressable
                style={styles.tooltipClose}
                onPress={() => setShowInfo(false)}
              >
                <Text style={styles.tooltipCloseText}>Got it</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  infoButton: {
    padding: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  tooltip: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    maxWidth: 400,
    width: '100%',
    gap: spacing.md,
  },
  tooltipTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  tooltipText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  tooltipClose: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  tooltipCloseText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.background,
  },
});
