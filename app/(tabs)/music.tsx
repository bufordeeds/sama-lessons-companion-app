import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SheetMusicLibrary } from '@/components/practice/SheetMusicLibrary';
import { colors, spacing } from '@/constants/theme';

export default function MusicScreen() {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      <SheetMusicLibrary />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
