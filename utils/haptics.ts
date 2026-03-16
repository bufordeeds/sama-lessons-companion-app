import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { getPreference } from '@/db/queries';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Cache the haptics preference in memory to avoid async calls on every haptic event.
// Updated whenever the preference is checked.
let _hapticsEnabledCache = true;

async function refreshHapticsEnabled(): Promise<boolean> {
  const pref = await getPreference('hapticsEnabled');
  _hapticsEnabledCache = pref !== 'false';
  return _hapticsEnabledCache;
}

// Initialize cache on module load
refreshHapticsEnabled();

/**
 * Call this whenever the haptics preference changes (e.g., from settings)
 * to keep the cache in sync.
 */
export { refreshHapticsEnabled };

export function hapticLight() {
  if (isNative && _hapticsEnabledCache) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticMedium() {
  if (isNative && _hapticsEnabledCache) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSelection() {
  if (isNative && _hapticsEnabledCache) Haptics.selectionAsync();
}

export function hapticNotification(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Warning) {
  if (isNative && _hapticsEnabledCache) Haptics.notificationAsync(type);
}
