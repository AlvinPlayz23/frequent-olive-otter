import React from 'react';
import { Text, type TextProps } from 'react-native';
import { colors, type, type TypeVariant } from '@/lib/theme';

export interface TxtProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
}

/** One type ramp for the whole app. */
export function Txt({ variant = 'body', color = colors.ink, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[type[variant], { color }, style]} />;
}
