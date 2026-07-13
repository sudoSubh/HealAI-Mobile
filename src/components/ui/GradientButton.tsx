/**
 * GradientButton — Primary CTA with indigo→violet gradient.
 *
 * Props:
 *   label: button text
 *   onPress: handler
 *   loading?: shows spinner
 *   disabled?: grays out
 *   icon?: MCI icon name (left)
 *   fullWidth?: spans container
 *   style?: additional styles
 */
import React from 'react';
import { TouchableOpacity, View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useHealTheme, radii } from '../../theme';
import { shadows } from '../../theme/styles';
import { AppText } from './AppText';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function GradientButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: GradientButtonProps) {
  const { colors } = useHealTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[fullWidth && { width: '100%' }, style]}
    >
      <LinearGradient
        colors={disabled ? ['#94a3b8', '#94a3b8'] : [...colors.primaryGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          !disabled && shadows.cta,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={styles.content}>
            {icon && (
              <MaterialCommunityIcons name={icon as any} size={20} color="#fff" style={{ marginRight: 8 }} />
            )}
            <AppText variant="body" color="#fff" style={styles.label}>
              {label}
            </AppText>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    minHeight: 52,
    borderRadius: radii.pill,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
  },
});

export default GradientButton;
