import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform, View as RNView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { apiFetch } from '@/lib/api';
import { colors, spacing, fontSize } from '@/constants/theme';

export default function PdfViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('Sheet Music');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Get the sheet title from the list
        const { sheets } = await apiFetch<{
          sheets: { id: string; title: string }[];
        }>('/sheets');
        const sheet = sheets.find((s) => s.id === id);
        if (sheet) setTitle(sheet.title);

        // Get presigned URL
        const data = await apiFetch<{ url: string }>(`/sheets/${id}/url`);
        setUrl(data.url);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load PDF');
      }
    })();
  }, [id]);

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  if (!url) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      </>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <RNView style={styles.container}>
          <iframe
            src={url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={title}
          />
        </RNView>
      </>
    );
  }

  // Native: use WebView for PDF rendering
  const WebView = require('react-native-webview').default;
  return (
    <>
      <Stack.Screen options={{ title }} />
      <RNView style={styles.container}>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
        />
      </RNView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
});
