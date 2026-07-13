/**
 * PressableScale — Wraps children with a spring press animation (scale 0.97).
 *
 * Props:
 *   onPress: handler
 *   disabled?: boolean
 *   style?: additional ViewStyle
 *   children: content
 */
import React, { ReactNode } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '../../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  children: ReactNode;
}

export function PressableScale({ onPress, disabled, style, children }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, motion.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.press);
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default PressableScale;
