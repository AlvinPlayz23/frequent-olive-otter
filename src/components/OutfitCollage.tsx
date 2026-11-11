import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from './Txt';
import { colors, radius } from '@/lib/theme';
import type { Item } from '@/lib/types';

interface OutfitCollageProps {
  items: Item[];
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  showCount?: boolean;
}

function Cell({ item, style }: { item: Item; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.cell, style]}>
      <Image
        source={{ uri: item.thumbUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={160}
      />
    </View>
  );
}

/** A look composed from the real pieces — no AI call needed. */
export function OutfitCollage({
  items,
  style,
  borderRadius = radius.lg,
  showCount = true,
}: OutfitCollageProps) {
  const visible = items.slice(0, 4);
  const extra = items.length - visible.length;

  let content: React.ReactNode;
  if (visible.length === 0) {
    content = (
      <View style={styles.empty}>
        <Ionicons name="shirt-outline" size={26} color={colors.inkFaint} />
      </View>
    );
  } else if (visible.length === 1) {
    content = <Cell item={visible[0]} style={styles.fill} />;
  } else if (visible.length === 2) {
    content = (
      <View style={styles.row}>
        <Cell item={visible[0]} style={styles.flex} />
        <Cell item={visible[1]} style={styles.flex} />
      </View>
    );
  } else if (visible.length === 3) {
    content = (
      <View style={styles.row}>
        <Cell item={visible[0]} style={styles.wide} />
        <View style={styles.column}>
          <Cell item={visible[1]} style={styles.flex} />
          <Cell item={visible[2]} style={styles.flex} />
        </View>
      </View>
    );
  } else {
    content = (
      <View style={styles.column}>
        <View style={styles.row}>
          <Cell item={visible[0]} style={styles.flex} />
          <Cell item={visible[1]} style={styles.flex} />
        </View>
        <View style={styles.row}>
          <Cell item={visible[2]} style={styles.flex} />
          <Cell item={visible[3]} style={styles.flex} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      {content}
      {showCount && extra > 0 ? (
        <View style={styles.badge}>
          <Txt variant="caption" color={colors.white} style={styles.badgeText}>
            +{extra}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paperDeep,
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperDeep,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  cell: {
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  flex: {
    flex: 1,
  },
  wide: {
    flex: 1.45,
  },
  fill: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    minWidth: 30,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(26,24,21,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
