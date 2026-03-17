import React, { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, Pressable, View as RNView, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { SheetMusicLibrary } from '@/components/practice/SheetMusicLibrary';
import { useAuth } from '@/providers/AuthProvider';
import { apiFetch, getToken } from '@/lib/api';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '@/constants/theme';

interface TeacherSheet {
  id: string;
  title: string;
  fileType: string;
  curriculumItemId: string | null;
  teacherName: string;
  createdAt: string;
}

export default function MusicScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [teacherSheets, setTeacherSheets] = useState<TeacherSheet[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadSheets = useCallback(async () => {
    try {
      const data = await apiFetch<{ sheets: TeacherSheet[] }>('/sheets');
      setTeacherSheets(data.sheets);
    } catch {
      // Sheets endpoint may not be deployed yet
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSheets();
    }, [loadSheets]),
  );

  const handleUpload = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Upload', 'PDF upload is currently only supported on web.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const title = file.name.replace(/\.pdf$/i, '');
      setUploading(true);
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);

        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://sama.buford.dev/api';
        const res = await fetch(`${baseUrl}/sheets/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Upload failed: ${res.status}`);
        }

        await loadSheets();
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert(`Upload failed: ${err.message}`);
        } else {
          Alert.alert('Upload Failed', err.message);
        }
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, [loadSheets]);

  const handleDeleteSheet = useCallback(async (sheetId: string) => {
    const doDelete = async () => {
      try {
        await apiFetch(`/sheets/${sheetId}`, { method: 'DELETE' });
        await loadSheets();
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert(`Delete failed: ${err.message}`);
        } else {
          Alert.alert('Delete Failed', err.message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this sheet music?')) doDelete();
    } else {
      Alert.alert('Delete Sheet', 'Delete this sheet music?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [loadSheets]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {isTeacher && (
        <Pressable
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : 'Upload PDF'}
          </Text>
        </Pressable>
      )}

      {teacherSheets.length > 0 && (
        <RNView style={styles.section}>
          <Text style={styles.sectionLabel}>Lessons</Text>
          {teacherSheets.map((sheet) => (
            <RNView key={sheet.id} style={styles.row}>
              <Pressable
                style={styles.rowContent}
                onPress={() => router.push(`/sheet-music/pdf/${sheet.id}` as any)}
              >
                <RNView style={styles.rowLeft}>
                  <Text style={styles.rowName}>{sheet.title}</Text>
                  <Text style={styles.pdfTag}>PDF</Text>
                </RNView>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
              {isTeacher && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSheet(sheet.id)}
                >
                  <Text style={styles.deleteText}>×</Text>
                </Pressable>
              )}
            </RNView>
          ))}
        </RNView>
      )}

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
    gap: spacing.lg,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.background,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pdfTag: {
    fontSize: fontSize.xs,
    color: colors.danger,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  arrow: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  deleteButton: {
    marginLeft: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: fontSize.lg,
    color: colors.danger,
    fontWeight: '700',
  },
});
