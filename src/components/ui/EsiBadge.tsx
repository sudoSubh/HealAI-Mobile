/**
 * EsiBadge — ESI level indicator in two sizes.
 *
 * Props:
 *   level: 1–5
 *   size: 'pill' (compact, for lists) | 'hero' (large, for Priority screen)
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ESI_COLORS, useHealTheme, radii } from '../../theme';
import { AppText } from './AppText';

interface EsiBadgeProps {
  level: 1 | 2 | 3 | 4 | 5;
  size?: 'pill' | 'hero';
}

export function EsiBadge({ level, size = 'pill' }: EsiBadgeProps) {
  const { isDark } = useHealTheme();
  const esiData = ESI_COLORS[level];

  if (size === 'hero') {
    return (
      <View
        style={[
          styles.heroBadge,
          { backgroundColor: isDark ? esiData.bgDark : esiData.bg, borderColor: esiData.primary },
        ]}
        accessibilityLabel={`ESI ${level}, ${esiData.label}`}
        accessibilityRole="text"
      >
        <AppText variant="display" color={esiData.primary} style={styles.heroNumber}>
          {level}
        </AppText>
        <AppText variant="caption" color={esiData.text} style={styles.heroLabel}>
          {esiData.label}
        </AppText>
      </View>
    );
  }

  // Pill size
  return (
    <View
      style={[styles.pill, { backgroundColor: isDark ? esiData.bgDark : esiData.bg }]}
      accessibilityLabel={`ESI ${level}, ${esiData.label}`}
      accessibilityRole="text"
    >
      <View style={[styles.pillDot, { backgroundColor: esiData.primary }]} />
      <AppText variant="micro" color={esiData.text} style={styles.pillText}>
        ESI {level}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  heroBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  heroLabel: {
    textTransform: 'uppercase',
    fontWeight: '800',
    marginTop: -4,
  },
});

export default EsiBadge;
