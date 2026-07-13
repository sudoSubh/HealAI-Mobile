/**
 * AppText — Typography primitive with design-system variants.
 *
 * Props:
 *   variant: 'display' | 'headline' | 'title' | 'body' | 'caption' | 'micro' | 'mono'
 *   color?: string (overrides theme text color)
 *   style?: additional styles
 *   children: text content
 */
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useHealTheme, typeScale } from '../../theme';

export type AppTextVariant = keyof typeof typeScale;

interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, children, ...rest }: AppTextProps) {
  const { colors } = useHealTheme();
  const scale = typeScale[variant];

  const computedStyle: TextStyle = {
    ...scale,
    color: color ?? colors.text,
  };

  return (
    <Text style={[computedStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

export default AppText;
