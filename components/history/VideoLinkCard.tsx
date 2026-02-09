import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, View as RNView, Image, Linking, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from '@/components/Themed';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';

interface VideoLinkCardProps {
  videoUrl: string;
  onUpdateUrl?: (url: string) => void;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function VideoLinkCard({ videoUrl, onUpdateUrl }: VideoLinkCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(videoUrl);

  const videoId = extractYouTubeId(videoUrl);
  const thumbnailUri = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  const handleOpen = useCallback(() => {
    Linking.openURL(videoUrl);
  }, [videoUrl]);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed !== videoUrl) {
      onUpdateUrl?.(trimmed);
    }
    setIsEditing(false);
  }, [draft, videoUrl, onUpdateUrl]);

  const handleStartEditing = useCallback(() => {
    setDraft(videoUrl);
    setIsEditing(true);
  }, [videoUrl]);

  if (isEditing) {
    return (
      <RNView style={styles.container}>
        <RNView style={styles.editHeader}>
          <FontAwesome name="youtube-play" size={16} color="#FF0000" />
          <Text style={styles.editTitle}>Video Link</Text>
        </RNView>
        <TextInput
          style={styles.urlInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="https://youtu.be/..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoFocus
        />
        <RNView style={styles.editActions}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => setIsEditing(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </RNView>
      </RNView>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handleOpen}>
      <RNView style={styles.cardContent}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
        ) : (
          <RNView style={styles.thumbnailFallback}>
            <FontAwesome name="youtube-play" size={28} color="#FF0000" />
          </RNView>
        )}
        <RNView style={styles.textContent}>
          <RNView style={styles.labelRow}>
            <FontAwesome name="youtube-play" size={14} color="#FF0000" />
            <Text style={styles.label}>Recorded Session</Text>
          </RNView>
          <Text style={styles.url} numberOfLines={1}>
            {videoUrl}
          </Text>
        </RNView>
        {onUpdateUrl && (
          <Pressable
            style={styles.editButton}
            onPress={handleStartEditing}
            hitSlop={12}
          >
            <FontAwesome name="pencil" size={14} color={colors.textMuted} />
          </Pressable>
        )}
      </RNView>
    </Pressable>
  );
}

interface AddVideoButtonProps {
  onAdd: (url: string) => void;
}

export function AddVideoButton({ onAdd }: AddVideoButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) {
      onAdd(trimmed);
      setDraft('');
    }
    setIsAdding(false);
  }, [draft, onAdd]);

  if (isAdding) {
    return (
      <RNView style={styles.container}>
        <RNView style={styles.editHeader}>
          <FontAwesome name="youtube-play" size={16} color="#FF0000" />
          <Text style={styles.editTitle}>Add Video Link</Text>
        </RNView>
        <TextInput
          style={styles.urlInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="https://youtu.be/..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoFocus
        />
        <RNView style={styles.editActions}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => { setIsAdding(false); setDraft(''); }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </RNView>
      </RNView>
    );
  }

  return (
    <Pressable style={styles.addButton} onPress={() => setIsAdding(true)}>
      <FontAwesome name="youtube-play" size={14} color={colors.textMuted} />
      <Text style={styles.addButtonText}>Add video link...</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 45,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  thumbnailFallback: {
    width: 80,
    height: 45,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  url: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  editButton: {
    padding: spacing.sm,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  urlInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.background,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
