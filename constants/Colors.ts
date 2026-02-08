import { colors } from './theme';

// Both light and dark map to the same dark palette — forces always-dark UI
const palette = {
  text: colors.text,
  background: colors.background,
  tint: colors.primary,
  tabIconDefault: colors.textMuted,
  tabIconSelected: colors.primary,
};

export default {
  light: palette,
  dark: palette,
};
