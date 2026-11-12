import React, { type ReactNode } from 'react';
import {
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { EASE_OUT } from '@/lib/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

/**
 * Feedback on press-in, not release — 140ms, UI thread, interruptible.
 * Reduced motion removes the scale but keeps the control responsive.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.97,
  hitSlop,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityHint,
  accessibilityState,
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const amount = reduced ? 0 : 1 - scaleTo;
    return {
      transform: [{ scale: 1 - amount * pressed.get() }],
    };
  });

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop}
      pressRetentionOffset={14}
      onPressIn={() => {
        pressed.set(withTiming(1, { duration: 140, easing: EASE_OUT }));
      }}
      onPressOut={() => {
        pressed.set(withTiming(0, { duration: 180, easing: EASE_OUT }));
      }}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </AnimatedPressable>
  );
}
