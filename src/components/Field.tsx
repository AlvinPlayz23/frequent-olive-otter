import React, { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Txt } from './Txt';
import { colors, radius, type } from '@/lib/theme';

interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  accessory?: ReactNode;
  inputStyle?: TextInputProps['style'];
}

export function Field({
  label,
  hint,
  error,
  containerStyle,
  accessory,
  inputStyle,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <Txt variant="eyebrow" color={colors.inkSoft} style={styles.label}>
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.box,
          multiline ? styles.boxMultiline : null,
          {
            borderColor: error ? colors.danger : focused ? colors.ink : colors.lineStrong,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={colors.inkFaint}
          selectionColor={colors.ink}
          style={[styles.input, multiline ? styles.inputMultiline : null, inputStyle]}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      {error ? (
        <Txt variant="caption" color={colors.danger} style={styles.helper}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" color={colors.inkFaint} style={styles.helper}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    marginLeft: 2,
  },
  box: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxMultiline: {
    minHeight: 104,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.ink,
    padding: 0,
    minHeight: 24,
  },
  inputMultiline: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  accessory: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    marginTop: 7,
    marginLeft: 2,
  },
});
