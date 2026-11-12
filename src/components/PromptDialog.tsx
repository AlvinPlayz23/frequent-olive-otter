import React, { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Txt } from './Txt';
import { Button } from './Button';
import { colors, radius, shadows, type } from '@/lib/theme';

interface PromptDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

/**
 * A cross-platform replacement for `Alert.prompt`, which only exists on iOS.
 * The card is centred, the input focuses when the modal settles, and the
 * keyboard pushes the card instead of covering it on Android.
 */
export function PromptDialog({
  visible,
  title,
  message,
  placeholder,
  value,
  onChangeText,
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const trimmed = value.trim();

  const submit = () => {
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
      onShow={() => inputRef.current?.focus()}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
        >
          <Pressable
            onPress={() => undefined}
            style={[styles.card, { width: Math.min(width - 48, 360) }]}
          >
            <Txt variant="headline">{title}</Txt>
            {message ? (
              <Txt variant="callout" color={colors.inkSoft} style={styles.message}>
                {message}
              </Txt>
            ) : null}

            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={colors.inkFaint}
              selectionColor={colors.ink}
              returnKeyType="done"
              onSubmitEditing={submit}
              selectTextOnFocus
              maxLength={80}
              accessibilityLabel={title}
              style={styles.input}
            />

            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                size="md"
                onPress={onCancel}
                style={styles.action}
              />
              <Button
                label={confirmLabel}
                variant="accent"
                size="md"
                onPress={submit}
                disabled={!trimmed}
                style={styles.action}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.paperSoft,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    ...(shadows.floating ?? {}),
  },
  message: {
    marginTop: 8,
  },
  input: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    ...type.body,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  action: {
    flex: 1,
  },
});
