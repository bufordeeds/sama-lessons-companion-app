import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SyncService, type SyncStatus } from '@/services/SyncService';
import { colors } from '@/constants/theme';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(SyncService.status);

  useEffect(() => {
    return SyncService.subscribe(setStatus);
  }, []);

  const handlePress = useCallback(() => {
    if (status === 'error' || status === 'offline') {
      SyncService.fullSync();
    }
  }, [status]);

  if (status === 'idle') return null;

  if (status === 'syncing') {
    return (
      <ActivityIndicator
        size="small"
        color={colors.textSecondary}
        style={styles.indicator}
      />
    );
  }

  if (status === 'offline') {
    return (
      <Pressable onPress={handlePress} style={styles.indicator} hitSlop={12}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  // error
  return (
    <Pressable onPress={handlePress} style={styles.indicator} hitSlop={12}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  indicator: {
    marginRight: 8,
  },
});
