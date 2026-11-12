import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Skeleton } from '@/components/Skeleton';
import { PressableScale } from '@/components/PressableScale';
import { useLibrary } from '@/lib/library';
import { useSettings } from '@/lib/settings';
import { ingestImage, readForAI, deleteImageFiles } from '@/lib/files';
import { analyzeGarment } from '@/lib/ai/gemini';
import { friendlyError } from '@/lib/ai/client';
import { CATEGORIES, type Category, type ItemSource, type StoredImage } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { select, success, tap, warn } from '@/lib/haptics';

type Stage = 'source' | 'url' | 'details';
type Busy = 'ingest' | 'save' | 'analyze' | null;

export default function AddItemScreen() {
  const params = useLocalSearchParams<{
    imageUrl?: string;
    thumbUrl?: string;
    suggestedName?: string;
  }>();
  const { addItem } = useLibrary();
  const { settings, hasGemini } = useSettings();

  const [stage, setStage] = useState<Stage>('source');
  const [staged, setStaged] = useState<StoredImage | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('top');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [source, setSource] = useState<ItemSource>('library');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | undefined>();
  const [needsGemini, setNeedsGemini] = useState(false);
  const [url, setUrl] = useState('');

  const stagedRef = useRef<StoredImage | null>(null);
  const savedRef = useRef(false);
  const paramStarted = useRef(false);

  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  useEffect(() => {
    return () => {
      if (!savedRef.current && stagedRef.current) {
        deleteImageFiles(stagedRef.current).catch(() => undefined);
      }
    };
  }, []);

  const ingest = useCallback(
    async (uri: string, from: ItemSource, suggested?: string) => {
      setBusy('ingest');
      setError(null);
      setErrorDetail(undefined);
      setNeedsGemini(false);
      try {
        const image = await ingestImage(uri, 'piece');
        const previous = stagedRef.current;
        setStaged(image);
        stagedRef.current = image;
        if (previous) {
          await deleteImageFiles(previous);
        }
        setSource(from);
        if (suggested) {
          setName((current) => current || suggested);
        }
        setStage('details');
      } catch (caught) {
        warn();
        setError('That image could not be prepared.');
        setErrorDetail(friendlyError(caught));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  // A piece chosen in Discover arrives with an image URL.
  useEffect(() => {
    if (paramStarted.current || !params.imageUrl) return;
    paramStarted.current = true;
    const suggested = params.suggestedName
      ? params.suggestedName.replace(/\s*[|–-]\s*[^|–-]{2,40}$/, '').trim().slice(0, 48)
      : undefined;
    setStage('details');
    setBusy('ingest');
    (async () => {
      try {
        const image = await ingestImage(params.imageUrl as string, 'piece');
        setStaged(image);
        stagedRef.current = image;
        setSource('web');
        if (suggested) setName(suggested);
        setStage('details');
      } catch {
        if (params.thumbUrl) {
          try {
            const image = await ingestImage(params.thumbUrl, 'piece');
            setStaged(image);
            stagedRef.current = image;
            setSource('web');
            if (suggested) setName(suggested);
            setStage('details');
            return;
          } catch {
            // Fall through to the friendly error below.
          }
        }
        setError('That web image could not be downloaded.');
        setErrorDetail('Try another image, or save it to your photos first and add it from there.');
        setStage('source');
      } finally {
        setBusy(null);
      }
    })();
  }, [params.imageUrl, params.thumbUrl, params.suggestedName]);

  const pick = async (from: 'camera' | 'library') => {
    tap();
    setError(null);
    setErrorDetail(undefined);
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera access is off.');
          setErrorDetail('Allow camera access for Atelier in Settings, then try again.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
          await ingest(result.assets[0].uri, 'camera');
        }
      } else {
        // The system photo picker grants access per selection on both
        // platforms, so no library permission prompt is needed.
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
          await ingest(result.assets[0].uri, 'library');
        }
      }
    } catch (caught) {
      setError('The picker could not open.');
      setErrorDetail(friendlyError(caught));
    }
  };

  const fetchUrl = async () => {
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) {
      setError('That doesn’t look like a link.');
      setErrorDetail('Paste a direct image URL starting with http:// or https://.');
      return;
    }
    await ingest(value, 'url');
  };

  const autofill = async () => {
    if (!staged) return;
    if (!hasGemini) {
      setError('AI auto-fill needs a Gemini key.');
      setErrorDetail("Add one in Settings — it is free and stays in your device's secure storage.");
      setNeedsGemini(true);
      return;
    }
    setBusy('analyze');
    setError(null);
    setErrorDetail(undefined);
    setNeedsGemini(false);
    try {
      const image = await readForAI(staged.uri, 900);
      const insight = await analyzeGarment(settings.geminiKey, settings.textModel, image);
      setName(insight.name);
      setCategory(insight.category);
      if (insight.color) setColor(insight.color);
      if (insight.brand) setBrand(insight.brand);
      success();
    } catch (caught) {
      warn();
      setError('The piece could not be catalogued.');
      setErrorDetail(friendlyError(caught));
      setNeedsGemini(false);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!staged || !name.trim()) return;
    setBusy('save');
    setError(null);
    try {
      await addItem({
        imageUri: staged.uri,
        thumbUri: staged.thumbUri,
        name: name.trim(),
        category,
        color: color.trim() || undefined,
        brand: brand.trim() || undefined,
        source,
      });
      savedRef.current = true;
      success();
      router.back();
    } catch (caught) {
      warn();
      setError('The piece could not be saved.');
      setErrorDetail(friendlyError(caught));
      setBusy(null);
    }
  };

  const title = stage === 'url' ? 'From a link' : stage === 'details' ? 'New piece' : 'Add a piece';

  return (
    <View style={styles.root}>
      <ModalHeader title={title} onClose={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorNotice
              message={error}
              detail={errorDetail}
              actionLabel={needsGemini ? 'Open Settings' : undefined}
              onAction={needsGemini ? () => router.push('/settings') : undefined}
            />
          </View>
        ) : null}

        {stage === 'source' ? (
          <>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              A new piece
            </Txt>
            <Txt variant="title" style={styles.heading}>
              Where is it?
            </Txt>
            <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
              Bring in one thing you love. We will keep the photo on this device until you ask a
              model to dress it.
            </Txt>

            <View style={styles.rows}>
              <SourceRow
                icon="camera-outline"
                title="Take a photo"
                caption="Hang it, lay it flat, or shoot it on."
                tint={colors.limeWash}
                iconColor={colors.limeInk}
                onPress={() => pick('camera')}
              />
              <SourceRow
                icon="images-outline"
                title="From your library"
                caption="Pick a photo you already have."
                tint={colors.clayWash}
                iconColor={colors.clay}
                onPress={() => pick('library')}
              />
              <SourceRow
                icon="link-outline"
                title="Paste a link"
                caption="A direct image URL from any shop or site."
                tint={colors.indigoWash}
                iconColor={colors.indigo}
                onPress={() => {
                  tap();
                  setError(null);
                  setStage('url');
                }}
              />
              <SourceRow
                icon="search-outline"
                title="Search the web"
                caption="Find it on the open web, then keep it."
                tint={colors.paperDeep}
                iconColor={colors.inkSoft}
                onPress={() => {
                  tap();
                  router.dismissTo('/(tabs)/search');
                }}
              />
            </View>

            <Txt variant="caption" color={colors.inkFaint} style={styles.footnote}>
              Photos stay in Atelier’s private storage. Only the pieces you choose to render are sent
              to your chosen AI provider.
            </Txt>
          </>
        ) : null}

        {stage === 'url' ? (
          <>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              Direct image
            </Txt>
            <Txt variant="title" style={styles.heading}>
              Paste the source.
            </Txt>
            <Field
              label="Image URL"
              placeholder="https://…/jacket.jpg"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={fetchUrl}
              containerStyle={styles.field}
            />
            <Button
              label="Fetch image"
              icon="arrow-down-circle-outline"
              variant="ink"
              onPress={fetchUrl}
              loading={busy === 'ingest'}
              disabled={!url.trim()}
              style={styles.fullButton}
            />
            <Button
              label="Back"
              variant="ghost"
              size="sm"
              icon="arrow-back"
              onPress={() => {
                setError(null);
                setStage('source');
              }}
              style={styles.backButton}
            />
            <Txt variant="caption" color={colors.inkFaint} style={styles.footnote}>
              The link must point at an image file, not a page. If it won’t load, save the image to
              your photos and add it from there.
            </Txt>
          </>
        ) : null}

        {stage === 'details' ? (
          <>
            {!staged ? (
              <View>
                <Skeleton style={styles.preview} borderRadius={radius.xl} />
                <Txt variant="caption" color={colors.inkSoft} style={styles.preparing}>
                  Preparing your image…
                </Txt>
              </View>
            ) : (
              <>
                <View style={styles.previewWrap}>
                  <Image
                    source={{ uri: staged.uri }}
                    style={styles.preview}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.previewAction}>
                    <Button
                      label="Change"
                      variant="secondary"
                      size="sm"
                      icon="swap-horizontal"
                      onPress={() => {
                        tap();
                        setStage('source');
                      }}
                    />
                  </View>
                </View>

                <View style={styles.autofillRow}>
                  <Button
                    label="Auto-fill with AI"
                    icon="sparkles"
                    variant="secondary"
                    size="sm"
                    onPress={autofill}
                    loading={busy === 'analyze'}
                    disabled={busy !== null}
                  />
                  <Txt variant="caption" color={colors.inkFaint} style={styles.autofillHint}>
                    Names the piece, colour and category
                  </Txt>
                </View>

                <Field
                  label="Name"
                  placeholder="Washed leather bomber"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  containerStyle={styles.field}
                />

                <Txt variant="eyebrow" color={colors.inkSoft} style={styles.categoryLabel}>
                  Category
                </Txt>
                <View style={styles.categories}>
                  {CATEGORIES.map((entry) => (
                    <Chip
                      key={entry.key}
                      label={entry.label}
                      active={category === entry.key}
                      onPress={() => {
                        select();
                        setCategory(entry.key);
                      }}
                    />
                  ))}
                </View>

                <View style={styles.twoUp}>
                  <Field
                    label="Colour"
                    placeholder="Ecru"
                    value={color}
                    onChangeText={setColor}
                    containerStyle={styles.half}
                  />
                  <Field
                    label="Brand"
                    placeholder="Optional"
                    value={brand}
                    onChangeText={setBrand}
                    containerStyle={styles.half}
                  />
                </View>

                <Button
                  label="Add to wardrobe"
                  icon="add"
                  variant="accent"
                  onPress={save}
                  loading={busy === 'save'}
                  disabled={!name.trim() || busy === 'ingest' || busy === 'analyze'}
                  style={styles.save}
                />
                <Txt variant="caption" color={colors.inkFaint} style={styles.footnote}>
                  You can edit any of this later. Nothing is shared until you render a look.
                </Txt>
              </>
            )}
          </>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SourceRow({
  icon,
  title,
  caption,
  tint,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  tint: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.sourceRow} accessibilityLabel={title}>
      <View style={[styles.sourceIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>
      <View style={styles.sourceCopy}>
        <Txt variant="headline" style={styles.sourceTitle}>
          {title}
        </Txt>
        <Txt variant="caption" color={colors.inkSoft}>
          {caption}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 44,
  },
  errorWrap: {
    marginBottom: 18,
  },
  heading: {
    marginTop: 8,
  },
  lede: {
    marginTop: 10,
    maxWidth: 330,
  },
  rows: {
    marginTop: 24,
    gap: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCopy: {
    flex: 1,
    gap: 2,
  },
  sourceTitle: {
    fontSize: 16,
  },
  footnote: {
    marginTop: 20,
    lineHeight: 18,
  },
  field: {
    marginTop: 18,
  },
  fullButton: {
    marginTop: 6,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    marginLeft: -8,
  },
  previewWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  preview: {
    width: '100%',
    aspectRatio: 0.82,
    backgroundColor: colors.paperDeep,
  },
  previewAction: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  preparing: {
    marginTop: 12,
  },
  autofillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  autofillHint: {
    flex: 1,
    lineHeight: 16,
  },
  categoryLabel: {
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 2,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  twoUp: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  half: {
    flex: 1,
  },
  save: {
    marginTop: 26,
  },
});
