import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { colors, radius } from '@/lib/theme';
import { select } from '@/lib/haptics';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Chip({ label, active, onPress, icon }: ChipProps) {
  return (
    <PressableScale
      onPress={() => {
        if (onPress) {
          if (!active) select();
          onPress();
        }
      }}
      disabled={!onPress}
      scaleTo={0.96}
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.ink : colors.surface,
          borderColor: active ? colors.ink : colors.line,
        },
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={13}
            color={active ? colors.lime : colors.inkSoft}
          />
        ) : null}
        <Txt
          variant="label"
          color={active ? colors.paper : colors.inkSoft}
          style={styles.text}
        >
          {label}
        </Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 13,
  },
});
