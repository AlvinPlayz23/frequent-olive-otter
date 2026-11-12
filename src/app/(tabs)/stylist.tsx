import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ThinkingDots } from '@/components/ThinkingDots';
import { PressableScale } from '@/components/PressableScale';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useLibrary } from '@/lib/library';
import { useSettings } from '@/lib/settings';
import { stylistAdvice } from '@/lib/ai/gemini';
import { friendlyError } from '@/lib/ai/client';
import type { ChatMessage, Item, OutfitSuggestion } from '@/lib/types';
import { colors, radius, type } from '@/lib/theme';
import { select, success, tap, warn } from '@/lib/haptics';
import { useKeyboardVisible } from '@/lib/useKeyboardVisible';

const PROMPTS = [
  'Build a look for a gallery opening tonight.',
  'What should I wear to dinner when it’s cold?',
  'Style the newest piece in my wardrobe.',
  'Give me a sharper weekend look.',
];

export default function StylistScreen() {
  const { messages, items, outfits, addMessage, addSuggestionMessage, addOutfit, clearChat } =
    useLibrary();
  const { settings, hasGemini } = useSettings();
  const params = useLocalSearchParams<{ draft?: string }>();
  const keyboardVisible = useKeyboardVisible();
  const scrollRef = useRef<ScrollView>(null);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const draftUsed = useRef(false);
  const lastPrompt = useRef<string | null>(null);

  useEffect(() => {
    if (draftUsed.current || !params.draft) return;
    draftUsed.current = true;
    setInput(params.draft);
  }, [params.draft]);

  useEffect(() => {
    if (keyboardVisible) {
      const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timer);
    }
  }, [keyboardVisible]);

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const requestReply = async (prompt: string, history: ChatMessage[]) => {
    setSending(true);
    setError(null);
    try {
      const reply = await stylistAdvice({
        key: settings.geminiKey,
        model: settings.textModel,
        prompt,
        wardrobe: items,
        history,
      });
      await addSuggestionMessage(reply.reply, reply.suggestion, reply.tip);
      scrollToEnd();
    } catch (caught) {
      warn();
      setError({ message: friendlyError(caught) });
    } finally {
      setSending(false);
    }
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || sending) return;
    if (!hasGemini) {
      setError({
        message: 'The stylist needs a Gemini key.',
        detail: 'Add a free Gemini key in Settings. It stays in your iOS Keychain.',
      });
      return;
    }
    tap();
    const history = messages;
    setInput('');
    lastPrompt.current = text;
    await addMessage({ role: 'user', text });
    scrollToEnd();
    await requestReply(text, history);
  };

  const retry = () => {
    if (!lastPrompt.current) return;
    const trailingUser =
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user' &&
      messages[messages.length - 1].text === lastPrompt.current;
    const history = trailingUser ? messages.slice(0, -1) : messages;
    requestReply(lastPrompt.current, history);
  };

  const saveSuggestion = async (message: ChatMessage) => {
    const suggestion = message.suggestion;
    if (!suggestion || savingMessage) return;
    const validIds = suggestion.itemIds.filter((id) => itemsById.has(id));
    if (validIds.length === 0) {
      warn();
      setError({
        message: 'Those pieces are no longer in your wardrobe.',
        detail: 'Ask the stylist for a look built from what you have now.',
      });
      return;
    }
    setSavingMessage(message.id);
    try {
      await addOutfit({ name: suggestion.name, itemIds: validIds });
      success();
    } catch {
      warn();
    } finally {
      setSavingMessage(null);
    }
  };

  const confirmClear = () => {
    if (messages.length === 0) return;
    tap();
    Alert.alert('Clear the conversation?', 'Saved looks stay in the studio.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearChat().catch(() => warn());
        },
      },
    ]);
  };

  const subtitle = hasGemini
    ? `Knows all ${items.length} ${items.length === 1 ? 'piece' : 'pieces'} on your rail`
    : 'Add a Gemini key to begin';

  const suggestionIsSaved = (suggestion: OutfitSuggestion) => {
    const sorted = [...suggestion.itemIds].sort().join('|');
    return outfits.some((outfit) => [...outfit.itemIds].sort().join('|') === sorted);
  };

  const composer = (
    <View style={styles.composer}>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder={hasGemini ? 'Ask for a look…' : 'Add a Gemini key in Settings'}
        placeholderTextColor={colors.inkFaint}
        style={styles.input}
        multiline
        maxLength={500}
        editable={hasGemini}
        selectionColor={colors.ink}
        returnKeyType="default"
      />
      <PressableScale
        onPress={() => send()}
        disabled={!input.trim() || sending || !hasGemini}
        accessibilityLabel="Send to stylist"
        style={[
          styles.send,
          {
            backgroundColor:
              input.trim() && !sending && hasGemini ? colors.ink : colors.paperDeep,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.paper} />
        ) : (
          <Ionicons
            name="arrow-up"
            size={20}
            color={input.trim() && hasGemini ? colors.paper : colors.inkFaint}
          />
        )}
      </PressableScale>
    </View>
  );

  return (
    <Screen
      title="Stylist"
      eyebrow="Atelier AI"
      subtitle={subtitle}
      scrollRef={scrollRef}
      footer={composer}
      onContentSizeChange={scrollToEnd}
      right={
        <IconButton
          name="trash-outline"
          accessibilityLabel="Clear conversation"
          onPress={confirmClear}
          disabled={messages.length === 0}
        />
      }
    >
      {messages.length === 0 ? (
        <Intro
          hasGemini={hasGemini}
          itemCount={items.length}
          onPrompt={(prompt) => send(prompt)}
          onOpenSettings={() => router.push('/settings')}
        />
      ) : (
        <View style={styles.thread}>
          {messages.map((message) =>
            message.role === 'user' ? (
              <Animated.View
                key={message.id}
                entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
                style={styles.userRow}
              >
                <View style={styles.userBubble}>
                  <Txt variant="body" color={colors.paper}>
                    {message.text}
                  </Txt>
                </View>
              </Animated.View>
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                items={itemsById}
                saved={message.suggestion ? suggestionIsSaved(message.suggestion) : false}
                saving={savingMessage === message.id}
                onSave={() => saveSuggestion(message)}
              />
            ),
          )}

          {sending ? (
            <Animated.View entering={FadeIn.duration(180)} style={styles.thinking}>
              <View style={styles.assistantEyebrow}>
                <View style={styles.assistantDot} />
                <Txt variant="eyebrow" color={colors.inkFaint}>
                  Atelier
                </Txt>
              </View>
              <ThinkingDots />
            </Animated.View>
          ) : null}
        </View>
      )}

      {error ? (
        <View style={styles.errorWrap}>
          <ErrorNotice
            message={error.message}
            detail={error.detail}
            actionLabel={hasGemini ? 'Try again' : 'Open Settings'}
            onAction={hasGemini ? retry : () => router.push('/settings')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function Intro({
  hasGemini,
  itemCount,
  onPrompt,
  onOpenSettings,
}: {
  hasGemini: boolean;
  itemCount: number;
  onPrompt: (prompt: string) => void;
  onOpenSettings: () => void;
}) {
  return (
    <View>
      <Txt variant="title" style={styles.introTitle}>
        What are we{'\n'}dressing for?
      </Txt>
      <Txt variant="body" color={colors.inkSoft} style={styles.introBody}>
        Tell me the occasion, the weather, or the piece you want to build around. I’ll only use what
        is already on your rail.
      </Txt>

      {!hasGemini ? (
        <View style={styles.setupCard}>
          <View style={styles.setupIcon}>
            <Ionicons name="sparkles" size={18} color={colors.limeInk} />
          </View>
          <Txt variant="headline" style={styles.setupTitle}>
            Connect Gemini to begin.
          </Txt>
          <Txt variant="callout" color={colors.inkSoft} style={styles.setupBody}>
            A free Gemini key powers the stylist and the AI cataloguing. It stays in your Keychain
            and is called directly from this device.
          </Txt>
          <Button
            label="Add a Gemini key"
            icon="key-outline"
            variant="ink"
            size="md"
            onPress={onOpenSettings}
            style={styles.setupButton}
          />
        </View>
      ) : null}

      {hasGemini && itemCount < 2 ? (
        <PressableScale
          onPress={() => router.push('/add-item')}
          accessibilityLabel="Add pieces to the wardrobe"
          style={styles.railNote}
        >
          <Ionicons name="shirt-outline" size={18} color={colors.inkSoft} />
          <Txt variant="callout" color={colors.inkSoft} style={styles.railNoteText}>
            The rail is nearly empty. Add a few pieces so I can build real looks.
          </Txt>
          <Ionicons name="arrow-forward" size={16} color={colors.inkFaint} />
        </PressableScale>
      ) : null}

      <View style={styles.prompts}>
        {PROMPTS.map((prompt) => (
          <PressableScale
            key={prompt}
            onPress={() => {
              if (!hasGemini) {
                onOpenSettings();
                return;
              }
              select();
              onPrompt(prompt);
            }}
            accessibilityLabel={prompt}
            style={styles.prompt}
          >
            <Txt variant="callout" style={styles.promptText}>
              {prompt}
            </Txt>
            <Ionicons
              name="arrow-up-outline"
              size={16}
              color={colors.inkSoft}
              style={styles.promptIcon}
            />
          </PressableScale>
        ))}
      </View>

      <Txt variant="caption" color={colors.inkFaint} style={styles.introNote}>
        The stylist works from your wardrobe and your words. It never invents a piece you don’t own.
      </Txt>
    </View>
  );
}

function AssistantMessage({
  message,
  items,
  saved,
  saving,
  onSave,
}: {
  message: ChatMessage;
  items: Map<string, Item>;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const suggestion = message.suggestion;
  const suggestionItems = suggestion
    ? suggestion.itemIds.map((id) => items.get(id)).filter((item): item is Item => Boolean(item))
    : [];

  return (
    <Animated.View
      entering={FadeInUp.duration(260).reduceMotion(ReduceMotion.System)}
      style={styles.assistant}
    >
      <View style={styles.assistantEyebrow}>
        <View style={styles.assistantDot} />
        <Txt variant="eyebrow" color={colors.inkFaint}>
          Atelier
        </Txt>
      </View>
      <Txt variant="body" style={styles.assistantText}>
        {message.text}
      </Txt>
      {message.tip ? (
        <Txt variant="callout" color={colors.inkSoft} style={styles.tip}>
          {message.tip}
        </Txt>
      ) : null}

      {suggestion && suggestionItems.length > 0 ? (
        <View style={styles.suggestion}>
          <Txt variant="eyebrow" color={colors.inkFaint}>
            Proposed look
          </Txt>
          <Txt variant="headline" style={styles.suggestionName}>
            {suggestion.name}
          </Txt>
          <View style={styles.thumbs}>
            {suggestionItems.slice(0, 5).map((item) => (
              <Image
                key={item.id}
                source={{ uri: item.thumbUri }}
                style={styles.thumb}
                contentFit="cover"
                transition={120}
              />
            ))}
          </View>
          <Txt variant="callout" color={colors.inkSoft} style={styles.reason}>
            {suggestion.reason}
          </Txt>
          <Button
            label={saved ? 'Saved as a look' : 'Save this look'}
            icon={saved ? 'checkmark' : 'add'}
            variant={saved ? 'secondary' : 'accent'}
            size="sm"
            disabled={saved || saving}
            loading={saving}
            onPress={onSave}
            style={styles.saveButton}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: 24,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '84%',
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    borderBottomRightRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  assistant: {
    alignItems: 'flex-start',
  },
  assistantEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  assistantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.limeDeep,
  },
  assistantText: {
    lineHeight: 23,
    maxWidth: 340,
  },
  tip: {
    marginTop: 8,
    maxWidth: 330,
    fontStyle: 'italic',
  },
  thinking: {
    paddingTop: 2,
  },
  suggestion: {
    marginTop: 14,
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
  },
  suggestionName: {
    marginTop: 7,
  },
  thumbs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  thumb: {
    width: 52,
    height: 66,
    borderRadius: 8,
    backgroundColor: colors.paperDeep,
  },
  reason: {
    marginTop: 11,
  },
  saveButton: {
    alignSelf: 'flex-start',
    marginTop: 13,
  },
  errorWrap: {
    marginTop: 18,
  },
  intro: {
    paddingTop: 4,
  },
  introTitle: {
    fontSize: 32,
    lineHeight: 36,
  },
  introBody: {
    marginTop: 12,
    maxWidth: 330,
  },
  setupCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  setupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  setupTitle: {
    marginBottom: 6,
  },
  setupBody: {
    maxWidth: 320,
  },
  setupButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  railNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.paperSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  railNoteText: {
    flex: 1,
  },
  prompts: {
    marginTop: 26,
    gap: 8,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
  },
  promptIcon: {
    transform: [{ rotate: '45deg' }],
  },
  introNote: {
    marginTop: 22,
    lineHeight: 18,
    maxWidth: 330,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 7,
    paddingVertical: 7,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.ink,
    maxHeight: 96,
    paddingTop: 9,
    paddingBottom: 9,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
