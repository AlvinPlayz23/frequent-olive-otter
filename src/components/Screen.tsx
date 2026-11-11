import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  View,
  type ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './Txt';
import { colors, tabBarSpace } from '@/lib/theme';
import { useKeyboardVisible } from '@/lib/useKeyboardVisible';

interface ScreenProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: React.Ref<ScrollView>;
  onContentSizeChange?: (width: number, height: number) => void;
}

/**
 * A paper page with a large editorial title and a frosted header that
 * materializes only when content scrolls beneath it — no hard divider.
 */
export function Screen({
  title,
  eyebrow,
  subtitle,
  right,
  children,
  footer,
  contentContainerStyle,
  scrollRef,
  onContentSizeChange,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.get(),
      [22, 66],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const bottomPadding = footer
    ? 20
    : 28 + (keyboardVisible ? 0 : tabBarSpace(insets.bottom));

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={footer ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 14,
              paddingBottom: bottomPadding,
            },
            contentContainerStyle,
          ]}
        >
          <View style={styles.titleBlock}>
            {eyebrow ? (
              <Txt variant="eyebrow" color={colors.inkFaint} style={styles.eyebrow}>
                {eyebrow}
              </Txt>
            ) : null}
            <View style={styles.titleRow}>
              <Txt variant="display" style={styles.title}>
                {title}
              </Txt>
              {right ? <View style={styles.right}>{right}</View> : null}
            </View>
            {subtitle ? (
              <Txt variant="callout" color={colors.inkSoft} style={styles.subtitle}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
          {children}
        </Animated.ScrollView>

        {footer ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: keyboardVisible ? 10 : tabBarSpace(insets.bottom) - 12,
              },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.compactHeader,
          { height: insets.top + 48, paddingTop: insets.top },
          headerStyle,
        ]}
      >
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.compactTint} />
        <View style={styles.compactRow}>
          <Txt variant="label" numberOfLines={1} style={styles.compactTitle}>
            {title}
          </Txt>
        </View>
        <View style={styles.hairline} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  titleBlock: {
    marginBottom: 22,
  },
  eyebrow: {
    marginBottom: 10,
    marginLeft: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
  },
  right: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.paper,
  },
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  compactTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244, 240, 231, 0.76)',
  },
  compactRow: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
  },
  compactTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
});
