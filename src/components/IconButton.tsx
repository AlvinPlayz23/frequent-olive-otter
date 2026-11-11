import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { colors, radius } from '@/lib/theme';
import { tap } from '@/lib/haptics';

type Tone = 'paper' | 'ink' | 'ghost' | 'glass' | 'danger';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  tone?: Tone;
  accessibilityLabel: string;
  disabled?: boolean;
}

const tones: Record<Tone, { bg: string; border: string; fg: string }> = {
  paper: { bg: colors.surface, border: colors.line, fg: colors.ink },
  ink: { bg: colors.ink, border: colors.ink, fg: colors.paper },
  ghost: { bg: 'transparent', border: 'transparent', fg: colors.ink },
  glass: { bg: 'rgba(252,250,244,0.78)', border: 'rgba(26,24,21,0.08)', fg: colors.ink },
  danger: { bg: colors.dangerWash, border: 'transparent', fg: colors.danger },
};

export function IconButton({
  name,
  onPress,
  size = 44,
  iconSize = 20,
  tone = 'paper',
  accessibilityLabel,
  disabled,
}: IconButtonProps) {
  const palette = tones[tone];
  return (
    <PressableScale
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled}
      scaleTo={0.92}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        borderRadius: size === 44 ? radius.pill : size / 2,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={name} size={iconSize} color={palette.fg} />
    </PressableScale>
  );
}

export const iconButtonStyles = StyleSheet.create({});
