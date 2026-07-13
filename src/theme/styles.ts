import { Platform, StyleSheet } from 'react-native';

// ─── Platform-specific shadow presets ─────────────────────────────────────
export const shadows = {
  card: Platform.select({
    ios: { shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 3 },
    default: {},
  }),
  cardDark: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
    android: { elevation: 3 },
    default: {},
  }),
  cta: Platform.select({
    ios: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
    android: { elevation: 8 },
    default: {},
  }),
  tab: Platform.select({
    ios: { shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 12 },
    default: {},
  }),
};

export const hairline = StyleSheet.hairlineWidth;
