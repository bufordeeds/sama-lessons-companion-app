import { Alert, Platform } from 'react-native';

/**
 * Cross-platform destructive confirmation dialog.
 * Uses window.confirm on web, Alert.alert on native.
 */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else {
      onCancel?.();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
