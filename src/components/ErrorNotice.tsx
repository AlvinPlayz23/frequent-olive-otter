import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Txt } from './Txt';
import { colors, radius } from '@/lib/theme';

interface ErrorNoticeProps {
  title?: string;
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorNotice({
  title = 'That didn’t work',
  message,
  detail,
  actionLabel,
  onAction,
}: ErrorNoticeProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
        </View>
        <View style={styles.copy}>
          <Txt variant="label" color={colors.danger}>
            {title}
          </Txt>
          <Txt variant="callout" color={colors.ink} style={styles.message}>
            {message}
          </Txt>
          {detail ? (
            <Txt variant="caption" color={colors.inkSoft} style={styles.detail} numberOfLines={3}>
              {detail}
            </Txt>
          ) : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dangerWash,
    borderRadius: radius.md,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  icon: {
    paddingTop: 1,
  },
  copy: {
    flex: 1,
  },
  message: {
    marginTop: 3,
  },
  detail: {
    marginTop: 5,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 28,
  },
});
