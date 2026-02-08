export const colors = {
  background: '#1A1A1A',
  surface: '#242424',
  surfaceLight: '#2E2E2E',
  border: '#3A3A3A',

  text: '#F5F5F5',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',

  primary: '#D4A843',       // amber/gold
  primaryDim: '#A07E30',

  success: '#4CAF50',       // green — passed
  successDim: '#2E7D32',
  mastered: '#FFD700',       // gold — mastered

  danger: '#EF5350',         // red — broke / destructive
  dangerDim: '#C62828',

  ostinatoA: '#2A2520',      // warm tint for A variants
  ostinatoB: '#1E2428',      // cool tint for B variants

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const touchTarget = {
  min: 48,
  comfortable: 56,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;
