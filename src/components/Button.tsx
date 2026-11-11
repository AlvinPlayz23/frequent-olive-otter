import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { colors, radius } from '@/lib/theme';

type Variant = 'accent' | 'ink' | 'secondary' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface ButtonProps {
  label?: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  accent: { bg: colors.lime, fg: colors.limeInk, border: colors.lime },
  ink: { bg: colors.ink, fg: colors.paper, border: colors.ink },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.lineStrong },
  ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  danger: { bg: colors.dangerWash, fg: colors.danger, border: 'transparent' },
};

const sizing: Record<Size, { height: number; pad: number; radii: number; icon: number }> = {
  lg: { height: 54, pad: 22, radii: radius.lg, icon: 18 },
  md: { height: 46, pad: 18, radii: radius.md, icon: 17 },
  sm: { height: 36, pad: 14, radii: radius.pill, icon: 15 },
};

export function Button({
  label,
  onPress,
  variant = 'ink',
  size = 'lg',
  icon,
  iconPosition = 'left',
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const tone = palette[variant];
  const dims = sizing[size];
  const inactive = disabled || loading;

  const iconNode = icon ? (
    <Ionicons name={icon} size={dims.icon} color={tone.fg} />
  ) : null;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        {
          minHeight: dims.height,
          paddingHorizontal: dims.pad,
          borderRadius: dims.radii,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: inactive ? 0.45 : 1,
        },
        fullWidth ? styles.full : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={tone.fg} />
        ) : iconPosition === 'left' ? (
          iconNode
        ) : null}
        {label ? (
          <Txt
            variant="button"
            color={tone.fg}
            numberOfLines={1}
            style={size === 'sm' ? styles.smallLabel : undefined}
          >
            {label}
          </Txt>
        ) : null}
        {!loading && iconPosition === 'right' ? iconNode : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  full: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  smallLabel: {
    fontSize: 13,
  },
});
