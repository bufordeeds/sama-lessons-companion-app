import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { getPreference } from '@/db/queries';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function isHapticsEnabled(): boolean {
  const pref = getPreference('hapticsEnabled');
  return pref !== 'false';
}

export function hapticLight() {
  if (isNative && isHapticsEnabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticMedium() {
  if (isNative && isHapticsEnabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSelection() {
  if (isNative && isHapticsEnabled()) Haptics.selectionAsync();
}

export function hapticNotification(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Warning) {
  if (isNative && isHapticsEnabled()) Haptics.notificationAsync(type);
}
