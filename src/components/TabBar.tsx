import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { colors, radius, TAB_BAR_HEIGHT } from '@/lib/theme';
import { EASE_OUT } from '@/lib/animations';
import { select, tap } from '@/lib/haptics';
import { useKeyboardVisible } from '@/lib/useKeyboardVisible';

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  index: { active: 'shirt', idle: 'shirt-outline' },
  studio: { active: 'albums', idle: 'albums-outline' },
  stylist: { active: 'sparkles', idle: 'sparkles-outline' },
  search: { active: 'search', idle: 'search-outline' },
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const reduced = useReducedMotion();
  const hidden = useSharedValue(0);

  useEffect(() => {
    hidden.set(
      withTiming(keyboardVisible ? 1 : 0, {
        duration: keyboardVisible ? 160 : 250,
        easing: EASE_OUT,
      }),
    );
  }, [keyboardVisible, hidden]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.get() * 0.92,
    transform: [{ translateY: (reduced ? 0 : 130) * hidden.get() }],
  }));

  return (
    <Animated.View
      pointerEvents={keyboardVisible ? 'none' : 'auto'}
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 10) + 4 },
        wrapStyle,
      ]}
    >
      <View style={styles.shell}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        <View style={styles.highlight} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.title === 'string'
                ? options.title
                : typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : route.name;
            const focused = state.index === index;
            const icon = ICONS[route.name] ?? ICONS.index;

            return (
              <PressableScale
                key={route.key}
                style={styles.tab}
                scaleTo={0.94}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (focused) {
                    tap();
                    return;
                  }
                  select();
                  if (!event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
              >
                <View
                  style={[
                    styles.iconPill,
                    focused ? styles.iconPillActive : null,
                  ]}
                >
                  <Ionicons
                    name={focused ? icon.active : icon.idle}
                    size={20}
                    color={focused ? colors.limeInk : colors.inkSoft}
                  />
                </View>
                <Txt
                  variant="caption"
                  color={focused ? colors.ink : colors.inkSoft}
                  style={styles.label}
                >
                  {label}
                </Txt>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    borderRadius: radius.xl,
    shadowColor: '#231D13',
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    zIndex: 30,
  },
  shell: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 24, 21, 0.09)',
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(252, 250, 244, 0.74)',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 42,
    height: 27,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.lime,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
});
