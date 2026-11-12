import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { useLibrary } from '@/lib/library';
import { useSettings } from '@/lib/settings';
import { castPersona } from '@/lib/image';
import { ingestImage, deleteImageFiles } from '@/lib/files';
import { AIError, friendlyError } from '@/lib/ai/client';
import type { Persona, StoredImage } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { select, success, tap, warn } from '@/lib/haptics';

type Mode = 'list' | 'ai' | 'photo';

const DESCRIPTORS = [
  'Editorial, androgynous, cropped hair',
  'Warm, curly hair, soft features',
  'Silver-haired, minimal, in their 50s',
  'Athletic, deep skin tone, close crop',
];

export default function PersonasScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { personas, addPersona, removePersona } = useLibrary();
  const { settings, hasNvidia, hasGemini } = useSettings();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.max(140, (width - 52) / 2);

  const initialMode: Mode =
    params.mode === 'ai' || params.mode === 'photo' ? params.mode : 'list';
  const [mode, setMode] = useState<Mode>(initialMode);

  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | undefined>();
  const [needsKey, setNeedsKey] = useState(false);
  const [photo, setPhoto] = useState<StoredImage | null>(null);

  const photoRef = useRef<StoredImage | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (!savedRef.current && photoRef.current) {
        deleteImageFiles(photoRef.current).catch(() => undefined);
      }
    };
  }, []);

  const resetErrors = () => {
    setError(null);
    setErrorDetail(undefined);
    setNeedsKey(false);
  };

  const createWithAI = async () => {
    if (working) return;
    if (!hasNvidia && !hasGemini) {
      setError('Casting needs an image key.');
      setErrorDetail(
        'Add a free NVIDIA or Gemini key in Settings. It stays in your iOS Keychain and is used only from this device.',
      );
      setNeedsKey(true);
      return;
    }
    setWorking(true);
    resetErrors();
    try {
      const generated = await castPersona(
        settings,
        descriptor.trim() || 'a model with a calm, editorial presence',
      );
      savedRef.current = true;
      await addPersona({
        name: name.trim() || `Model ${String(personas.length + 1).padStart(2, '0')}`,
        imageUri: generated.image.uri,
        thumbUri: generated.image.thumbUri,
        descriptor: descriptor.trim() || undefined,
        source: 'ai',
      });
      success();
      router.back();
    } catch (caught) {
      const ai = caught instanceof AIError ? caught : null;
      setError('The model could not be cast.');
      setErrorDetail(friendlyError(caught));
      setNeedsKey(ai?.code === 'NO_KEY' || ai?.code === 'AUTH');
      warn();
    } finally {
      setWorking(false);
    }
  };

  const pickPhoto = async (from: 'library' | 'camera') => {
    tap();
    resetErrors();
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera access is off.');
          setErrorDetail('Allow camera access for Atelier in iOS Settings, then try again.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Photo access is off.');
          setErrorDetail('Allow photo access for Atelier in iOS Settings, then try again.');
          return;
        }
      }

      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 1,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 1,
              allowsEditing: false,
            });

      if (result.canceled || !result.assets[0]) return;
      setWorking(true);
      const image = await ingestImage(result.assets[0].uri, 'persona', 1400);
      if (photoRef.current) {
        await deleteImageFiles(photoRef.current);
      }
      photoRef.current = image;
      setPhoto(image);
      setName((current) => current || 'Me');
    } catch (caught) {
      setError('That photo could not be prepared.');
      setErrorDetail(friendlyError(caught));
      warn();
    } finally {
      setWorking(false);
    }
  };

  const savePhotoPersona = async () => {
    if (!photo || working) return;
    setWorking(true);
    resetErrors();
    try {
      await addPersona({
        name: name.trim() || 'Me',
        imageUri: photo.uri,
        thumbUri: photo.thumbUri,
        descriptor: 'A photograph of me',
        source: 'photo',
      });
      savedRef.current = true;
      success();
      router.back();
    } catch (caught) {
      setError('The photo could not be saved.');
      setErrorDetail(friendlyError(caught));
      warn();
    } finally {
      setWorking(false);
    }
  };

  const confirmDelete = (persona: Persona) => {
    tap();
    Alert.alert(`Remove ${persona.name}?`, 'Rendered looks that used this model stay in your lookbook.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removePersona(persona)
            .then(() => select())
            .catch(() => warn());
        },
      },
    ]);
  };

  const title =
    mode === 'ai' ? 'Cast a model' : mode === 'photo' ? 'From a photo' : 'Models';

  return (
    <View style={styles.root}>
      <ModalHeader
        title={title}
        onClose={() => router.back()}
        right={
          mode === 'list' ? (
            <IconButton
              name="add"
              tone="ink"
              accessibilityLabel="Create a model"
              onPress={() => {
                tap();
                setMode('ai');
              }}
            />
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {mode === 'list' ? (
          <>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              The cast
            </Txt>
            <Txt variant="title" style={styles.heading}>
              Who wears the work?
            </Txt>
            <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
              Cast a fictional model with AI, or use a full-body photo of yourself. Try-ons keep the
              face and body you bring.
            </Txt>

            {error ? (
              <View style={styles.errorWrap}>
                <ErrorNotice
                  message={error}
                  detail={errorDetail}
                  actionLabel={needsKey ? 'Open Settings' : undefined}
                  onAction={needsKey ? () => router.push('/settings') : undefined}
                />
              </View>
            ) : null}

            {personas.length === 0 ? (
              <EmptyState
                icon="person-outline"
                eyebrow="No one yet"
                title="An empty studio."
                body="Create an editorial model, or step in front of the camera yourself."
                actionLabel="Create a model"
                onAction={() => setMode('ai')}
                secondary={
                  <Button
                    label="Use my photo"
                    icon="images-outline"
                    variant="ghost"
                    size="sm"
                    onPress={() => setMode('photo')}
                  />
                }
              />
            ) : (
              <View style={styles.grid}>
                {personas.map((persona) => (
                  <View key={persona.id} style={{ width: cardWidth }}>
                    <View style={styles.cardImageWrap}>
                      <Image
                        source={{ uri: persona.thumbUri }}
                        style={{ width: cardWidth, height: cardWidth * 1.25 }}
                        contentFit="cover"
                        transition={160}
                      />
                      <PressableScale
                        onPress={() => confirmDelete(persona)}
                        accessibilityLabel={`Remove ${persona.name}`}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="close" size={13} color={colors.ink} />
                      </PressableScale>
                      <View style={styles.sourceBadge}>
                        <Txt variant="caption" style={styles.sourceBadgeText}>
                          {persona.source === 'ai' ? 'AI' : 'YOU'}
                        </Txt>
                      </View>
                    </View>
                    <Txt variant="callout" numberOfLines={1} style={styles.cardName}>
                      {persona.name}
                    </Txt>
                  </View>
                ))}
              </View>
            )}

            {personas.length > 0 ? (
              <View style={styles.footerActions}>
                <Button
                  label="Create a model"
                  icon="sparkles"
                  variant="ink"
                  onPress={() => setMode('ai')}
                />
                <Button
                  label="Use a photo of yourself"
                  icon="person-outline"
                  variant="secondary"
                  onPress={() => setMode('photo')}
                />
              </View>
            ) : null}

            <Txt variant="caption" color={colors.inkFaint} style={styles.note}>
              Models are fictional unless you bring a photo. Everything stays on this device.
            </Txt>
          </>
        ) : null}

        {mode === 'ai' ? (
          <>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              Cast with AI
            </Txt>
            <Txt variant="title" style={styles.heading}>
              Describe the model.
            </Txt>
            <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
              A few cues are enough. The result is always a full-body studio portrait, so the
              try-on has somewhere to put the clothes.
            </Txt>

            {error ? (
              <View style={styles.errorWrap}>
                <ErrorNotice
                  message={error}
                  detail={errorDetail}
                  actionLabel={needsKey ? 'Open Settings' : undefined}
                  onAction={needsKey ? () => router.push('/settings') : undefined}
                />
              </View>
            ) : null}

            {working ? (
              <View style={styles.generating}>
                <Skeleton style={styles.generatingImage} borderRadius={radius.xl} />
                <Txt variant="headline" style={styles.generatingTitle}>
                  Casting a model…
                </Txt>
                <Txt variant="callout" color={colors.inkSoft} style={styles.generatingBody}>
                  This can take up to a minute. The image is generated on your own key.
                </Txt>
              </View>
            ) : (
              <>
                <Field
                  label="Name"
                  placeholder={`Model ${String(personas.length + 1).padStart(2, '0')}`}
                  hint="For the studio, not the image."
                  value={name}
                  onChangeText={setName}
                  containerStyle={styles.field}
                />
                <Field
                  label="The look"
                  placeholder="Editorial, androgynous, cropped hair…"
                  value={descriptor}
                  onChangeText={setDescriptor}
                  multiline
                  containerStyle={styles.field}
                />
                <View style={styles.chips}>
                  {DESCRIPTORS.map((entry) => (
                    <Chip
                      key={entry}
                      label={entry}
                      active={descriptor === entry}
                      onPress={() => {
                        select();
                        setDescriptor(entry);
                      }}
                    />
                  ))}
                </View>

                <Txt variant="caption" color={colors.inkFaint} style={styles.providerNote}>
                  {hasNvidia
                    ? 'NVIDIA FLUX generates first; Gemini takes over if it can’t.'
                    : hasGemini
                      ? 'Gemini will generate this model.'
                      : 'Add an NVIDIA or Gemini key in Settings to cast.'}
                </Txt>

                <Button
                  label="Cast this model"
                  icon="sparkles"
                  variant="accent"
                  onPress={createWithAI}
                  loading={working}
                  style={styles.submit}
                />
                <Button
                  label="Back to models"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    resetErrors();
                    setMode('list');
                  }}
                  style={styles.backButton}
                />
              </>
            )}
          </>
        ) : null}

        {mode === 'photo' ? (
          <>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              Use yourself
            </Txt>
            <Txt variant="title" style={styles.heading}>
              Bring your own body.
            </Txt>
            <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
              A full-body photo, head to toe, in even light works best. Face the camera with arms
              relaxed at your sides.
            </Txt>

            {error ? (
              <View style={styles.errorWrap}>
                <ErrorNotice
                  message={error}
                  detail={errorDetail}
                  actionLabel={needsKey ? 'Open Settings' : undefined}
                  onAction={needsKey ? () => router.push('/settings') : undefined}
                />
              </View>
            ) : null}

            {photo ? (
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoPreview}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <View style={styles.photoEmpty}>
                <Ionicons name="person-outline" size={30} color={colors.inkFaint} />
                <Txt variant="caption" color={colors.inkSoft}>
                  No photo yet.
                </Txt>
              </View>
            )}

            <View style={styles.photoButtons}>
              <Button
                label={photo ? 'Choose another' : 'From library'}
                icon="images-outline"
                variant="secondary"
                size="md"
                onPress={() => pickPhoto('library')}
                loading={working}
                style={styles.photoButton}
              />
              <Button
                label="Take a photo"
                icon="camera-outline"
                variant="secondary"
                size="md"
                onPress={() => pickPhoto('camera')}
                loading={working}
                style={styles.photoButton}
              />
            </View>

            <Field
              label="Name"
              placeholder="Me"
              value={name}
              onChangeText={setName}
              containerStyle={styles.field}
            />

            <Button
              label="Save this model"
              icon="checkmark"
              variant="accent"
              onPress={savePhotoPersona}
              disabled={!photo || working}
              loading={working}
              style={styles.submit}
            />
            <Button
              label="Back to models"
              variant="ghost"
              size="sm"
              onPress={() => {
                resetErrors();
                setMode('list');
              }}
              style={styles.backButton}
            />
            <Txt variant="caption" color={colors.inkFaint} style={styles.note}>
              A photo only leaves this device when you ask for a try-on, and only to your chosen AI
              provider.
            </Txt>
          </>
        ) : null}
      </ScrollView>
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
    paddingTop: 20,
  },
  heading: {
    marginTop: 8,
  },
  lede: {
    marginTop: 10,
    maxWidth: 330,
  },
  errorWrap: {
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  cardImageWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(252,250,244,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(26,24,21,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: colors.white,
  },
  cardName: {
    marginTop: 8,
    fontWeight: '600',
  },
  footerActions: {
    marginTop: 24,
    gap: 8,
  },
  note: {
    marginTop: 20,
    lineHeight: 18,
  },
  field: {
    marginTop: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  providerNote: {
    marginTop: 18,
    lineHeight: 17,
  },
  submit: {
    marginTop: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: -8,
  },
  generating: {
    marginTop: 22,
  },
  generatingImage: {
    width: '100%',
    aspectRatio: 0.8,
  },
  generatingTitle: {
    marginTop: 18,
  },
  generatingBody: {
    marginTop: 6,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.xl,
    backgroundColor: colors.paperDeep,
    marginTop: 20,
  },
  photoEmpty: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  photoButton: {
    flex: 1,
    paddingHorizontal: 10,
  },
});
