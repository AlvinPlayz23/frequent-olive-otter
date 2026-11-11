import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';

function Dot({
  index,
  progress,
  reduced,
}: {
  index: number;
  progress: SharedValue<number>;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.6, transform: [{ translateY: 0 }] };
    const phase = (progress.get() + index * 0.18) % 1;
    return {
      opacity: interpolate(phase, [0, 0.3, 0.65, 1], [0.28, 1, 0.5, 0.28]),
      transform: [{ translateY: interpolate(phase, [0, 0.45, 1], [0, -3, 0]) }],
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export function ThinkingDots() {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.set(
      withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  return (
    <View style={styles.row}>
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} progress={progress} reduced={reduced} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    height: 16,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.inkSoft,
  },
});
