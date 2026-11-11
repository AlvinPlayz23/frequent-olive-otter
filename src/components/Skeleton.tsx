import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '@/lib/theme';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export function Skeleton({ style, borderRadius = radius.md }: SkeletonProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced || width === 0) return;
    progress.set(0);
    progress.set(
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [reduced, width, progress]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + progress.get() * (width + 320) }],
  }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.base,
        { borderRadius, backgroundColor: colors.paperDeep },
        style,
      ]}
    >
      {!reduced && width > 0 ? (
        <Animated.View style={[styles.band, bandStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 160,
  },
});
