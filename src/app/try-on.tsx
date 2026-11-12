import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { useLibrary } from '@/lib/library';
import { useSettings } from '@/lib/settings';
import { tryOnLook } from '@/lib/image';
import { AIError, friendlyError } from '@/lib/ai/client';
import type { Item, StoredImage } from '@/lib/types';
import { timeAgo } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { success, tap, warn } from '@/lib/haptics';

const STATUS = [
  'Reading the silhouette',
  'Cutting the cloth',
  'Dressing the model',
  'Softening the light',
];

function nowMs() {
  return Date.now();
}

interface TryOnState {
  image: StoredImage;
  engine: string;
  createdAt: number;
}

export default function TryOnScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const { outfits, items, personas, addRender } = useLibrary();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();

  const outfit = outfits.find((entry) => entry.id === outfitId);
  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const outfitItems = outfit
    ? outfit.itemIds
        .map((id) => itemsById.get(id))
        .filter((item): item is Item => Boolean(item))
    : [];

  const [personaId, setPersonaId] = useState<string | null>(personas[0]?.id ?? null);
  const persona =
    personas.find((entry) => entry.id === personaId) ?? personas[0] ?? null;

  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [result, setResult] = useState<TryOnState | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<{
    message: string;
    detail?: string;
    subtle?: string;
  } | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  const running = useRef(false);

  useEffect(() => {
    if (phase !== 'working') return;
    const timer = setInterval(() => {
      setStatusIndex((index) => (index + 1) % STATUS.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [phase]);

  if (!outfit) {
    return (
      <View style={styles.root}>
        <ModalHeader title="Try on" onClose={() => router.back()} />
        <View style={styles.missing}>
          <Txt variant="title">That look is gone.</Txt>
          <Txt variant="body" color={colors.inkSoft} style={styles.missingBody}>
            Head back to the studio and choose another.
          </Txt>
          <Button label="Back" variant="secondary" size="md" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const generate = async () => {
    if (!persona || outfitItems.length === 0 || running.current) return;
    running.current = true;
    setStatusIndex(0);
    setPhase('working');
    setError(null);
    setSaved(false);
    try {
      const generated = await tryOnLook({
        settings,
        persona,
        outfitName: outfit.name,
        items: outfitItems,
      });
      setResult({ image: generated.image, engine: generated.engine, createdAt: nowMs() });
      setPhase('done');
      success();
      try {
        await addRender({
          outfitId: outfit.id,
          personaId: persona.id,
          imageUri: generated.image.uri,
          engine: generated.engine,
        });
        setSaved(true);
      } catch {
        warn();
      }
    } catch (caught) {
      setPhase('idle');
      setResult(null);
      const ai = caught instanceof AIError ? caught : null;
      setError({
        message: friendlyError(caught),
        detail: ai?.detail && ai.detail !== ai.message ? ai.detail : undefined,
        subtle: ai?.code,
      });
      warn();
    } finally {
      running.current = false;
    }
  };

  const share = async () => {
    if (!result) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Sharing is unavailable.');
      await Sharing.shareAsync(result.image.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share this look',
      });
    } catch {
      warn();
      Alert.alert('Could not share', 'The render is saved in the lookbook on this device.');
    }
  };

  const canvasWidth = width - 40;
  const engineNote =
    settings.imageEngine === 'gemini'
      ? 'Gemini image model · photo-preserving'
      : 'NVIDIA FLUX first · Gemini when a real photo needs it';

  return (
    <View style={styles.root}>
      <ModalHeader title="Try on" onClose={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Txt variant="eyebrow" color={colors.inkFaint}>
          The fitting room
        </Txt>
        <Txt variant="title" style={styles.heading}>
          {outfit.name}
        </Txt>
        <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
          {outfitItems.length} {outfitItems.length === 1 ? 'piece' : 'pieces'} · choose who wears it.
        </Txt>

        {personas.length === 0 ? (
          <View style={styles.castCard}>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              No model yet
            </Txt>
            <Txt variant="headline" style={styles.castTitle}>
              Who should wear it?
            </Txt>
            <Txt variant="callout" color={colors.inkSoft} style={styles.castBody}>
              Cast an editorial model with AI, or use a photo of yourself so the look lands on your
              own body.
            </Txt>
            <View style={styles.castButtons}>
              <Button
                label="Create a model"
                icon="sparkles"
                variant="accent"
                size="md"
                onPress={() => router.push({ pathname: '/personas', params: { mode: 'ai' } })}
                style={styles.castButton}
              />
              <Button
                label="Use my photo"
                icon="person"
                variant="secondary"
                size="md"
                onPress={() => router.push({ pathname: '/personas', params: { mode: 'photo' } })}
                style={styles.castButton}
              />
            </View>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personaRow}
            style={styles.personaScroll}
          >
            {personas.map((entry) => {
              const active = entry.id === persona?.id;
              return (
                <PressableScale
                  key={entry.id}
                  onPress={() => {
                    tap();
                    setPersonaId(entry.id);
                    setResult(null);
                    setSaved(false);
                    setPhase('idle');
                    setError(null);
                  }}
                  accessibilityLabel={`Wear this look as ${entry.name}`}
                  style={styles.persona}
                >
                  <View
                    style={[
                      styles.avatarRing,
                      active ? styles.avatarRingActive : null,
                    ]}
                  >
                    <Image
                      source={{ uri: entry.thumbUri }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  </View>
                  <Txt
                    variant="caption"
                    numberOfLines={1}
                    color={active ? colors.ink : colors.inkSoft}
                    style={styles.personaName}
                  >
                    {entry.name}
                  </Txt>
                  {active ? <View style={styles.personaDot} /> : null}
                </PressableScale>
              );
            })}
            <PressableScale
              onPress={() => router.push('/personas')}
              accessibilityLabel="Add another model"
              style={styles.persona}
            >
              <View style={styles.newAvatar}>
                <Ionicons name="add" size={22} color={colors.inkSoft} />
              </View>
              <Txt variant="caption" color={colors.inkSoft} style={styles.personaName}>
                New
              </Txt>
            </PressableScale>
          </ScrollView>
        )}

        <View style={[styles.canvas, { width: canvasWidth, height: canvasWidth * 1.26 }]}>
          {result ? (
            <>
              <Image
                source={{ uri: result.image.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={260}
              />
              <LinearGradient
                colors={['transparent', 'rgba(11,10,9,0.62)']}
                style={styles.resultShade}
                pointerEvents="none"
              />
              <View style={styles.resultMeta}>
                <View style={styles.enginePill}>
                  <Ionicons name="sparkles" size={10} color={colors.limeInk} />
                  <Txt variant="caption" color={colors.limeInk} style={styles.enginePillText}>
                    {result.engine}
                  </Txt>
                </View>
                <Txt variant="caption" color="rgba(255,255,255,0.7)">
                  {saved ? 'Saved to the lookbook' : 'Rendered just now'}
                </Txt>
              </View>
            </>
          ) : persona ? (
            <>
              <Image
                source={{ uri: persona.imageUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              <LinearGradient
                colors={['transparent', 'rgba(11,10,9,0.45)']}
                style={styles.canvasShade}
                pointerEvents="none"
              />
              <View style={styles.outfitStrip}>
                {outfitItems.slice(0, 4).map((item, index) => (
                  <Image
                    key={item.id}
                    source={{ uri: item.thumbUri }}
                    style={[
                      styles.stripThumb,
                      { marginLeft: index === 0 ? 0 : -12 },
                    ]}
                    contentFit="cover"
                  />
                ))}
                <Txt variant="caption" color="rgba(255,255,255,0.85)" style={styles.stripText}>
                  {outfit.name}
                </Txt>
              </View>
            </>
          ) : (
            <View style={styles.canvasEmpty}>
              <Ionicons name="person-outline" size={30} color={colors.inkFaint} />
              <Txt variant="caption" color={colors.inkSoft}>
                Choose a model to see this look.
              </Txt>
            </View>
          )}

          {phase === 'working' ? (
            <View style={styles.working}>
              <BlurView intensity={36} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.workingTint} />
              <View style={styles.workingCard}>
                <ProgressPill />
                <Skeleton style={styles.workingLine} borderRadius={4} />
                <Txt variant="headline" style={styles.workingTitle}>
                  {STATUS[statusIndex]}
                </Txt>
                <Txt variant="caption" color={colors.inkSoft} style={styles.workingBody}>
                  A first render can take 30–60 seconds. Keep the app open.
                </Txt>
              </View>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorWrap}>
            <ErrorNotice
              message={error.message}
              detail={error.detail}
              actionLabel={error.subtle === 'NEED_GEMINI' ? 'Add a Gemini key' : 'Open Settings'}
              onAction={() => router.push('/settings')}
            />
          </View>
        ) : null}

        {result ? (
          <>
            <View style={styles.resultActions}>
              <Button
                label="Render again"
                icon="refresh"
                variant="secondary"
                onPress={generate}
                style={styles.resultButton}
              />
              <Button
                label="Share"
                icon="share-outline"
                variant="accent"
                onPress={share}
                style={styles.resultButton}
              />
            </View>
            <Txt variant="caption" color={colors.inkFaint} style={styles.engineNote}>
              {result.engine} · {timeAgo(result.createdAt)}. The look is in this outfit’s lookbook.
            </Txt>
          </>
        ) : (
          <Button
            label={phase === 'working' ? 'Dressing…' : 'Try this look'}
            icon="sparkles"
            variant="accent"
            onPress={generate}
            loading={phase === 'working'}
            disabled={!persona || outfitItems.length === 0}
            style={styles.cta}
          />
        )}

        <Txt variant="caption" color={colors.inkFaint} style={styles.engineNote}>
          {engineNote}. Sent from this device straight to your provider.
        </Txt>
      </ScrollView>
    </View>
  );
}

function ProgressPill() {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.set(
      withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * (reduced ? 0 : 92) }],
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 44,
  },
  heading: {
    marginTop: 8,
  },
  lede: {
    marginTop: 8,
    marginBottom: 18,
  },
  castCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 16,
  },
  castTitle: {
    marginTop: 7,
  },
  castBody: {
    marginTop: 6,
  },
  castButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  castButton: {
    flex: 1,
    paddingHorizontal: 10,
  },
  personaScroll: {
    marginHorizontal: -20,
    marginBottom: 14,
  },
  personaRow: {
    paddingHorizontal: 20,
    gap: 14,
  },
  persona: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 3,
  },
  avatarRingActive: {
    borderColor: colors.ink,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: colors.paperDeep,
  },
  personaName: {
    maxWidth: 64,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  personaDot: {
    position: 'absolute',
    top: 49,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  newAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  canvas: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  canvasShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
  },
  canvasEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  outfitStrip: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripThumb: {
    width: 43,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(252,250,244,0.85)',
    backgroundColor: colors.paperDeep,
  },
  stripText: {
    marginLeft: 10,
    flex: 1,
  },
  working: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  workingTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244,240,231,0.5)',
  },
  workingCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: 'rgba(252,250,244,0.94)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(26,24,21,0.08)',
    padding: 18,
  },
  workingTitle: {
    marginTop: 14,
  },
  workingBody: {
    marginTop: 4,
    lineHeight: 17,
  },
  workingLine: {
    height: 10,
    width: '62%',
    marginTop: 14,
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.paperDeep,
    overflow: 'hidden',
  },
  progressFill: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.limeDeep,
  },
  resultShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '32%',
  },
  resultMeta: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enginePill: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enginePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  errorWrap: {
    marginTop: 16,
  },
  cta: {
    marginTop: 18,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  resultButton: {
    flex: 1,
    paddingHorizontal: 12,
  },
  engineNote: {
    marginTop: 12,
    lineHeight: 17,
  },
  missing: {
    padding: 28,
    alignItems: 'flex-start',
    gap: 12,
  },
  missingBody: {
    marginBottom: 8,
  },
});
