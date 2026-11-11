import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Txt } from './Txt';
import { colors, radius } from '@/lib/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  eyebrow?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondary?: ReactNode;
  art?: ReactNode;
}

export function EmptyState({
  icon = 'shirt-outline',
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
  secondary,
  art,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {art ?? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={26} color={colors.inkSoft} />
        </View>
      )}
      {eyebrow ? (
        <Txt variant="eyebrow" color={colors.inkFaint} style={styles.eyebrow}>
          {eyebrow}
        </Txt>
      ) : null}
      <Txt variant="title" style={styles.title}>
        {title}
      </Txt>
      <Txt variant="body" color={colors.inkSoft} style={styles.body}>
        {body}
      </Txt>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="ink"
          size="md"
          style={styles.action}
        />
      ) : null}
      {secondary ? <View style={styles.secondary}>{secondary}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 18,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  eyebrow: {
    marginBottom: 10,
  },
  title: {
    textAlign: 'center',
    maxWidth: 280,
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 10,
  },
  action: {
    marginTop: 22,
    minWidth: 180,
  },
  secondary: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
});
