import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';
import { Txt } from './Txt';
import { colors } from '@/lib/theme';

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
  right?: ReactNode;
}

export function ModalHeader({ title, onClose, right }: ModalHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onClose ? (
            <IconButton
              name="close"
              onPress={onClose}
              tone="paper"
              accessibilityLabel="Close"
            />
          ) : null}
        </View>
        <Txt variant="headline" numberOfLines={1} style={styles.title}>
          {title}
        </Txt>
        <View style={[styles.side, styles.rightSide]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 10,
    backgroundColor: colors.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  side: {
    width: 52,
    alignItems: 'flex-start',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
  },
});
