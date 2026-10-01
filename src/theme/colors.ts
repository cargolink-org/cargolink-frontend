/**
 * Minimal shared color tokens (introduced in Task G.2). `src/theme/` was an
 * empty scaffold until now; only the tokens the admin dashboard needs are
 * defined here — a fuller design-system pass belongs to Cluster H.1.
 * Using named constants (rather than hex literals inside StyleSheet.create)
 * also keeps the react-native/no-color-literals lint category from growing.
 */
export const colors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#E1E4E8',
  textPrimary: '#1A1D21',
  textSecondary: '#5B6470',
  accent: '#1F5FD1',
  accentSoft: '#DCE7FA',
  danger: '#B3261E',
  warning: '#B26A00',
  success: '#1E7B3A',
  skeleton: '#E6E9ED',
} as const;
