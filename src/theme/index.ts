import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

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

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0284c7', // vibrant cyan-blue
    primaryContainer: '#f0f9ff',
    onPrimaryContainer: '#0c4a6e',
    secondary: '#4f46e5', // vibrant royal indigo
    secondaryContainer: '#e0e7ff',
    onSecondaryContainer: '#312e81',
    tertiary: '#0d9488', // crisp teal
    tertiaryContainer: '#ccfbf1',
    surface: '#ffffff',
    surfaceVariant: '#f4f4f5',
    background: '#fafafa',
    error: '#ef4444',
    errorContainer: '#fef2f2',
    outline: '#e4e4e7',
    outlineVariant: '#f4f4f5',
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#fafafa',
      level3: '#f4f4f5',
      level4: '#e4e4e7',
      level5: '#d4d4d8',
    },
  },
  roundness: 24,
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#38bdf8', // bright electric sky blue
    primaryContainer: '#0c4a6e',
    onPrimaryContainer: '#e0f2fe',
    secondary: '#818cf8', // modern neon indigo
    secondaryContainer: '#312e81',
    onSecondaryContainer: '#e0e7ff',
    tertiary: '#2dd4bf', // glowing mint/teal
    tertiaryContainer: '#115e59',
    surface: '#121214', // deep crisp charcoal card background (no green)
    surfaceVariant: '#18181b', // zinc-900 highlight
    background: '#000000', // total black background
    error: '#f87171',
    errorContainer: '#450a0a',
    outline: '#27272a', // zinc-800 subtle borders
    outlineVariant: '#18181b',
    elevation: {
      level0: 'transparent',
      level1: '#121214', // zinc-900 surface
      level2: '#18181b',
      level3: '#27272a',
      level4: '#3f3f46',
      level5: '#52525b',
    },
  },
  roundness: 24,
};

export const Colors = {
  teal,
  emerald,
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
};
