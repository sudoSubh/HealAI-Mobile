/**
 * GlassCard — Premium surface card with hairline border + soft shadow.
 *
 * Props:
 *   children: content
 *   style?: additional ViewStyle
 *   padded?: apply default padding (default true)
 */
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useHealTheme, radii, spacing } from '../../theme';
import { shadows, hairline } from '../../theme/styles';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function GlassCard({ children, style, padded = true }: GlassCardProps) {
  const { isDark, colors } = useHealTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        isDark ? shadows.cardDark : shadows.card,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: hairline,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
});

export default GlassCard;
