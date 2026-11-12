import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { useSettings, type TextModel } from '@/lib/settings';
import { useLibrary } from '@/lib/library';
import { colors, radius } from '@/lib/theme';
import { select, success, tap, warn } from '@/lib/haptics';

const MODELS: { value: TextModel; label: string; note: string }[] = [
  { value: 'gemini-3.5-flash-lite', label: 'Flash-Lite 3.5', note: 'Newest' },
  { value: 'gemini-3.1-flash-lite', label: 'Flash-Lite 3.1', note: 'Stable' },
];

const LINKS = [
  {
    label: 'NVIDIA build keys',
    caption: 'Free credits for FLUX',
    url: 'https://build.nvidia.com',
  },
  {
    label: 'Google AI Studio',
    caption: 'Free Gemini API key',
    url: 'https://aistudio.google.com/apikey',
  },
  {
    label: 'Programmable Search',
    caption: 'Google image search key + engine id',
    url: 'https://programmablesearchengine.google.com/',
  },
];

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { renders, outfits, items, clearLookbook, resetAll } = useLibrary();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState({
    nvidiaKey: settings.nvidiaKey,
    geminiKey: settings.geminiKey,
    cseKey: settings.cseKey,
    cseCx: settings.cseCx,
  });
  const [visible, setVisible] = useState({ nvidia: false, gemini: false, cse: false });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2400);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const dirty = useMemo(
    () =>
      draft.nvidiaKey !== settings.nvidiaKey ||
      draft.geminiKey !== settings.geminiKey ||
      draft.cseKey !== settings.cseKey ||
      draft.cseCx !== settings.cseCx,
    [draft, settings],
  );

  const saveKeys = () => {
    update({
      nvidiaKey: draft.nvidiaKey.trim(),
      geminiKey: draft.geminiKey.trim(),
      cseKey: draft.cseKey.trim(),
      cseCx: draft.cseCx.trim(),
    });
    Keyboard.dismiss();
    success();
    setJustSaved(true);
  };

  const openLink = (url: string) => {
    tap();
    Linking.openURL(url).catch(() => {
      warn();
      Alert.alert('Could not open the link', url);
    });
  };

  const confirmClearLookbook = () => {
    tap();
    Alert.alert(
      'Clear the lookbook?',
      `${renders.length} rendered ${renders.length === 1 ? 'look' : 'looks'} will be deleted from this device. The outfits stay.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearLookbook()
              .then(() => success())
              .catch(() => warn());
          },
        },
      ],
    );
  };

  const confirmReset = () => {
    tap();
    Alert.alert(
      'Reset everything?',
      'Every piece, look, model, render and message will be deleted from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            resetAll()
              .then(() => {
                success();
                router.dismissAll();
              })
              .catch(() => warn());
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <ModalHeader
        title="Settings"
        onClose={() => router.back()}
        right={
          justSaved ? (
            <View style={styles.savedPill}>
              <Ionicons name="checkmark" size={12} color={colors.limeInk} />
              <Txt variant="caption" color={colors.limeInk} style={styles.savedText}>
                Saved
              </Txt>
            </View>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 44 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Txt variant="eyebrow" color={colors.inkFaint}>
          Atelier
        </Txt>
        <Txt variant="title" style={styles.heading}>
          Your keys.{'\n'}Your wardrobe.
        </Txt>
        <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
          Atelier has no server and no account. Every request goes from this phone straight to the
          provider whose key you add.
        </Txt>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              AI keys
            </Txt>
            <Ionicons name="lock-closed" size={13} color={colors.inkFaint} />
          </View>

          <KeyField
            label="NVIDIA NIM"
            hint="FLUX.3 — casting models, and try-on first."
            value={draft.nvidiaKey}
            onChangeText={(nvidiaKey) => setDraft((current) => ({ ...current, nvidiaKey }))}
            placeholder="nvapi-…"
            secure
            visible={visible.nvidia}
            onToggle={() => setVisible((current) => ({ ...current, nvidia: !current.nvidia }))}
          />

          <KeyField
            label="Google Gemini"
            hint="Stylist, AI cataloguing, photo try-on and backup images."
            value={draft.geminiKey}
            onChangeText={(geminiKey) => setDraft((current) => ({ ...current, geminiKey }))}
            placeholder="AIza…"
            secure
            visible={visible.gemini}
            onToggle={() => setVisible((current) => ({ ...current, gemini: !current.gemini }))}
          />

          <KeyField
            label="Google Search key"
            hint="Optional. Unlocks steadier, higher-quality image search."
            value={draft.cseKey}
            onChangeText={(cseKey) => setDraft((current) => ({ ...current, cseKey }))}
            placeholder="AIza…"
            secure
            visible={visible.cse}
            onToggle={() => setVisible((current) => ({ ...current, cse: !current.cse }))}
          />

          <Field
            label="Search engine id"
            placeholder="0123456789:abcdef"
            value={draft.cseCx}
            onChangeText={(cseCx) => setDraft((current) => ({ ...current, cseCx }))}
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={styles.field}
            hint="Found in the Programmable Search control panel."
          />

          <Button
            label={dirty ? 'Save keys' : 'Keys saved'}
            icon={dirty ? 'key-outline' : 'checkmark'}
            variant={dirty ? 'ink' : 'secondary'}
            size="md"
            onPress={saveKeys}
            disabled={!dirty}
            style={styles.saveKeys}
          />
          <Txt variant="caption" color={colors.inkFaint} style={styles.keychainNote}>
            Keys live in the iOS Keychain on this device. They never pass through a server we run.
          </Txt>
        </View>

        <Txt variant="eyebrow" color={colors.inkFaint} style={styles.sectionLabel}>
          Try-on engine
        </Txt>
        <Segment
          value={settings.imageEngine}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'gemini', label: 'Gemini' },
          ]}
          onChange={(value) => {
            select();
            update({ imageEngine: value });
          }}
        />
        <Txt variant="caption" color={colors.inkSoft} style={styles.sectionCaption}>
          {settings.imageEngine === 'auto'
            ? 'FLUX casts models first. Try-on tries NVIDIA, then falls back to Gemini when the preview cannot take a real photo.'
            : 'Every image uses Gemini. The most reliable path for dressing a real photograph.'}
        </Txt>

        <Txt variant="eyebrow" color={colors.inkFaint} style={styles.sectionLabel}>
          Stylist model
        </Txt>
        <View style={styles.modelRow}>
          {MODELS.map((model) => {
            const active = settings.textModel === model.value;
            return (
              <PressableScale
                key={model.value}
                onPress={() => {
                  if (!active) {
                    select();
                    update({ textModel: model.value });
                  }
                }}
                accessibilityLabel={`${model.label}, ${model.note}`}
                style={[styles.model, active ? styles.modelActive : null]}
              >
                <Txt variant="label" color={active ? colors.paper : colors.ink}>
                  {model.label}
                </Txt>
                <Txt
                  variant="caption"
                  color={active ? 'rgba(244,240,231,0.62)' : colors.inkFaint}
                >
                  {model.note}
                </Txt>
              </PressableScale>
            );
          })}
        </View>
        <Txt variant="caption" color={colors.inkSoft} style={styles.sectionCaption}>
          Both are on Gemini’s free tier. Flash-Lite keeps replies quick and cheap.
        </Txt>

        <Txt variant="eyebrow" color={colors.inkFaint} style={styles.sectionLabel}>
          Where to get keys
        </Txt>
        <View style={styles.links}>
          {LINKS.map((link, index) => (
            <PressableScale
              key={link.url}
              onPress={() => openLink(link.url)}
              accessibilityLabel={`Open ${link.label}`}
              style={[styles.link, index < LINKS.length - 1 ? styles.linkBorder : null]}
            >
              <View style={styles.linkCopy}>
                <Txt variant="label">{link.label}</Txt>
                <Txt variant="caption" color={colors.inkFaint}>
                  {link.caption}
                </Txt>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.inkSoft} />
            </PressableScale>
          ))}
        </View>

        <Txt variant="eyebrow" color={colors.inkFaint} style={styles.sectionLabel}>
          Your data
        </Txt>
        <View style={styles.card}>
          <DataRow
            label="Clear the lookbook"
            caption={`${renders.length} ${renders.length === 1 ? 'render' : 'renders'} · outfits stay`}
            onPress={confirmClearLookbook}
          />
          <View style={styles.rowDivider} />
          <DataRow
            label="Reset everything"
            caption={`${items.length} pieces · ${outfits.length} looks · cannot be undone`}
            onPress={confirmReset}
            danger
          />
        </View>

        <Txt variant="caption" color={colors.inkFaint} style={styles.about}>
          Atelier {version} · Built for the Native Now shell{'\n'}
          A quiet wardrobe, on your own keys.
        </Txt>
      </ScrollView>
    </View>
  );
}

function KeyField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  secure,
  visible,
  onToggle,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  visible?: boolean;
  onToggle?: () => void;
}) {
  return (
    <Field
      label={label}
      hint={hint}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      secureTextEntry={secure && !visible}
      containerStyle={styles.field}
      accessory={
        secure && onToggle ? (
          <IconButton
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={36}
            iconSize={17}
            tone="ghost"
            accessibilityLabel={visible ? 'Hide key' : 'Show key'}
            onPress={onToggle}
          />
        ) : undefined
      }
    />
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
          >
            <Txt
              variant="label"
              color={active ? colors.paper : colors.inkSoft}
              style={styles.segmentText}
            >
              {option.label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}

function DataRow({
  label,
  caption,
  onPress,
  danger,
}: {
  label: string;
  caption: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      style={styles.dataRow}
    >
      <View style={styles.dataCopy}>
        <Txt variant="label" color={danger ? colors.danger : colors.ink}>
          {label}
        </Txt>
        <Txt variant="caption" color={colors.inkFaint}>
          {caption}
        </Txt>
      </View>
      <Ionicons
        name={danger ? 'trash-outline' : 'chevron-forward'}
        size={16}
        color={danger ? colors.danger : colors.inkFaint}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heading: {
    marginTop: 8,
    lineHeight: 34,
  },
  lede: {
    marginTop: 12,
    maxWidth: 330,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  savedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  field: {
    marginTop: 16,
  },
  saveKeys: {
    marginTop: 20,
  },
  keychainNote: {
    marginTop: 12,
    lineHeight: 17,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionCaption: {
    marginTop: 9,
    lineHeight: 17,
    marginLeft: 2,
  },
  segment: {
    flexDirection: 'row',
    height: 48,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.paperDeep,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentItem: {
    flex: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontSize: 14,
  },
  modelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  model: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 3,
  },
  modelActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  links: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  linkBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  linkCopy: {
    flex: 1,
    gap: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
  },
  dataCopy: {
    flex: 1,
    gap: 2,
  },
  about: {
    marginTop: 30,
    lineHeight: 18,
  },
});
