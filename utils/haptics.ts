import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export function hapticLight() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticMedium() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSelection() {
  if (isNative) Haptics.selectionAsync();
}

export function hapticNotification(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Warning) {
  if (isNative) Haptics.notificationAsync(type);
}
