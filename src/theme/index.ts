import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// ─── HealAI Design System ─────────────────────────────────────────────────
// Warm, confident palette — "Calm Confidence" aesthetic.
// Indigo-violet primary conveys trust; warm surfaces replace clinical white.
// ──────────────────────────────────────────────────────────────────────────

const teal = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
};

const emerald = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
};

const indigo = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
};

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',           // Indigo — trust, calm, distinctive
    primaryContainer: '#eef2ff',
    onPrimaryContainer: '#312e81',
    secondary: '#06b6d4',         // Cyan — freshness, health
    secondaryContainer: '#ecfeff',
    onSecondaryContainer: '#164e63',
    tertiary: '#8b5cf6',          // Violet — premium feel
    tertiaryContainer: '#f5f3ff',
    surface: '#ffffff',
    surfaceVariant: '#f8f9ff',    // Very slight indigo tint
    background: '#fafaff',        // Warm white, not stark
    error: '#ef4444',
    errorContainer: '#fef2f2',
    outline: '#e2e4f0',           // Soft blue-gray borders
    outlineVariant: '#f0f1fa',
    onSurface: '#1e1b4b',         // Deep indigo-black — warmer than slate
    onSurfaceVariant: '#64748b',
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#f8f9ff',
      level3: '#f0f1fa',
      level4: '#e2e4f0',
      level5: '#d4d6e8',
    },
  },
  roundness: 20,
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',           // Soft indigo — pops on dark
    primaryContainer: '#312e81',
    onPrimaryContainer: '#e0e7ff',
    secondary: '#22d3ee',         // Bright cyan
    secondaryContainer: '#164e63',
    onSecondaryContainer: '#ecfeff',
    tertiary: '#a78bfa',          // Light violet
    tertiaryContainer: '#4c1d95',
    surface: '#12121e',           // Deep navy-tinted, NOT pure black
    surfaceVariant: '#1a1a2e',    // Dark indigo-tinted
    background: '#0a0a14',        // Deep navy-black
    error: '#f87171',
    errorContainer: '#450a0a',
    outline: '#2a2a3e',           // Soft indigo-gray borders
    outlineVariant: '#1a1a2e',
    onSurface: '#e8e8f0',         // Lavender-white — easy on eyes
    onSurfaceVariant: '#8888a0',
    elevation: {
      level0: 'transparent',
      level1: '#12121e',
      level2: '#1a1a2e',
      level3: '#2a2a3e',
      level4: '#3a3a50',
      level5: '#4a4a62',
    },
  },
  roundness: 20,
};

// ─── ESI Palette ────────────────────────────────────────────────────────
// Each level has a primary color, a light tint for backgrounds, and dark variant
export const ESI_COLORS = {
  1: { primary: '#dc2626', bg: '#fef2f2', bgDark: '#2a0a0a', label: 'EMERGENCY', text: '#991b1b' },
  2: { primary: '#ea580c', bg: '#fff7ed', bgDark: '#2a1508', label: 'URGENT',    text: '#c2410c' },
  3: { primary: '#f59e0b', bg: '#fffbeb', bgDark: '#2a1f08', label: 'MODERATE',  text: '#b45309' },
  4: { primary: '#22c55e', bg: '#f0fdf4', bgDark: '#0a2a14', label: 'LOW',       text: '#16a34a' },
  5: { primary: '#10b981', bg: '#ecfdf5', bgDark: '#082a1e', label: 'ROUTINE',   text: '#059669' },
} as const;

// ─── Plain-language action sentences for each ESI level ──────────────────
export const ESI_ACTION_TEXT = {
  1: 'This is a medical emergency. Call 112 or go to the ER now.',
  2: 'Go to the hospital now. Don\'t wait to see if it gets better.',
  3: 'See a doctor today. This needs professional attention soon.',
  4: 'You should see a doctor within a day or two.',
  5: 'You can manage this at home. Rest and monitor your symptoms.',
} as const;

// ─── Notification recipient mapping by ESI ───────────────────────────────
export const ESI_NOTIFY_TARGET = {
  1: { target: 'Hospital / Emergency', icon: 'hospital-building', autoCall: true },
  2: { target: 'Hospital / Emergency', icon: 'hospital-building', autoCall: true },
  3: { target: 'ASHA Worker / Clinic', icon: 'account-heart',     autoCall: false },
  4: { target: 'Caregiver / Family',   icon: 'account-group',     autoCall: false },
  5: { target: 'Caregiver / Family',   icon: 'account-group',     autoCall: false },
} as const;

export const Colors = {
  teal,
  emerald,
  indigo,
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
    400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
    800: '#9f1239', 900: '#881337',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
    400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
    800: '#5b21b6', 900: '#4c1d95',
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a',
  },
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a',
  },
  // New accent
  cyan: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
    400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
    800: '#155e75', 900: '#164e63',
  },
};

// ─── Spacing scale ──────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── Radius scale ───────────────────────────────────────────────────────
export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 9999,
} as const;

// ─── Type scale ─────────────────────────────────────────────────────────
export const typeScale = {
  display:  { fontSize: 32, fontWeight: '900' as const, lineHeight: 38, letterSpacing: -0.5 },
  headline: { fontSize: 24, fontWeight: '800' as const, lineHeight: 30 },
  title:    { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body:     { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption:  { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  micro:    { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
  mono:     { fontSize: 11, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.5 },
} as const;

// ─── Semantic color maps ────────────────────────────────────────────────
export const semanticColors = {
  light: {
    bg: '#fafaff',
    surface: '#ffffff',
    surfaceElevated: '#f8f9ff',
    border: '#e2e4f0',
    text: '#1e1b4b',
    textMuted: '#64748b',
    primary: '#6366f1',
    primaryGradient: ['#6366f1', '#8b5cf6'] as const,
    secondary: '#06b6d4',
    tertiary: '#8b5cf6',
    danger: '#ef4444',
    success: '#10b981',
    warn: '#f59e0b',
  },
  dark: {
    bg: '#0a0a14',
    surface: '#12121e',
    surfaceElevated: '#1a1a2e',
    border: '#2a2a3e',
    text: '#e8e8f0',
    textMuted: '#8888a0',
    primary: '#818cf8',
    primaryGradient: ['#818cf8', '#a78bfa'] as const,
    secondary: '#22d3ee',
    tertiary: '#a78bfa',
    danger: '#f87171',
    success: '#34d399',
    warn: '#fbbf24',
  },
} as const;

// ─── Hook: useHealTheme() ───────────────────────────────────────────────
import { useColorScheme } from 'react-native';

export function useHealTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? semanticColors.dark : semanticColors.light;
  return { isDark, colors, spacing, radii, typeScale, esi: ESI_COLORS };
}
