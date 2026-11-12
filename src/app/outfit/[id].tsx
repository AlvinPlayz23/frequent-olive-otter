import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { OutfitCollage } from '@/components/OutfitCollage';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { PromptDialog } from '@/components/PromptDialog';
import { useLibrary } from '@/lib/library';
import type { Item, Outfit, Render } from '@/lib/types';
import { categoryLabel, timeAgo } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { select, success, tap, warn } from '@/lib/haptics';

export default function OutfitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { outfits, items, renders, personas, editOutfit, removeOutfit, removeRender } = useLibrary();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const outfit = outfits.find((entry) => entry.id === id);
  const [picking, setPicking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [viewer, setViewer] = useState<Render | null>(null);

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const outfitItems = outfit
    ? outfit.itemIds.map((itemId) => itemsById.get(itemId)).filter((item): item is Item => Boolean(item))
    : [];

  const outfitRenders = renders.filter((render) => render.outfitId === id);
  const latestRender = outfitRenders[0];
  const remaining = items.filter((item) => !outfit?.itemIds.includes(item.id));
  const tile = Math.max(94, (width - 40 - 16) / 3);

  if (!outfit) {
    return (
      <View style={styles.root}>
        <ModalHeader title="Look" onClose={() => router.back()} />
        <EmptyState
          icon="albums-outline"
          eyebrow="Not here"
          title="This look is gone."
          body="It may have been deleted. Head back to the studio to compose another."
          actionLabel="Back to the studio"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const updateItems = async (itemIds: string[]) => {
    await editOutfit({ ...outfit, itemIds });
  };

  const menu = () => {
    tap();
    Alert.alert(outfit.name, 'What would you like to do?', [
      {
        text: 'Rename',
        onPress: () => {
          setRenameDraft(outfit.name);
          setRenaming(true);
        },
      },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete look',
        style: 'destructive',
        onPress: () => {
          removeOutfit(outfit as Outfit)
            .then(() => {
              select();
              router.back();
            })
            .catch(() => warn());
        },
      },
    ]);
  };

  const shareRender = async (render: Render) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(render.imageUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share this look',
      });
    } catch {
      warn();
      Alert.alert('Could not share', 'Try saving the image from the lookbook instead.');
    }
  };

  const lastPersona = latestRender
    ? personas.find((persona) => persona.id === latestRender.personaId)
    : undefined;

  return (
    <View style={styles.root}>
      <ModalHeader
        title="Look"
        onClose={() => router.back()}
        right={
          <IconButton
            name="ellipsis-horizontal"
            accessibilityLabel="Look options"
            onPress={menu}
          />
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          onPress={latestRender ? () => setViewer(latestRender) : undefined}
          disabled={!latestRender}
          scaleTo={0.985}
          accessibilityLabel={latestRender ? 'Open rendered look' : undefined}
          style={styles.heroWrap}
        >
          {latestRender ? (
            <Image
              source={{ uri: latestRender.imageUri }}
              style={styles.hero}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <OutfitCollage items={outfitItems} style={styles.hero} borderRadius={radius.xl} />
          )}
          {latestRender ? (
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={11} color={colors.limeInk} />
              <Txt variant="caption" color={colors.limeInk} style={styles.heroBadgeText}>
                Rendered{lastPersona ? ` on ${lastPersona.name}` : ''}
              </Txt>
            </View>
          ) : null}
        </PressableScale>

        <View style={styles.titleBlock}>
          <Txt variant="eyebrow" color={colors.inkFaint}>
            {outfitItems.length} {outfitItems.length === 1 ? 'piece' : 'pieces'}
            {latestRender ? ` · ${timeAgo(latestRender.createdAt)}` : ' · Not tried on yet'}
          </Txt>
          <Txt variant="title" style={styles.title}>
            {outfit.name}
          </Txt>
          {outfit.note ? (
            <Txt variant="body" color={colors.inkSoft} style={styles.note}>
              {outfit.note}
            </Txt>
          ) : null}
        </View>

        <Button
          label={latestRender ? 'Try it on again' : 'Try it on'}
          icon="sparkles"
          variant="accent"
          onPress={() =>
            router.push({ pathname: '/try-on', params: { outfitId: outfit.id } })
          }
          style={styles.primaryAction}
        />

        <View style={styles.secondaryRow}>
          <Button
            label="Ask the stylist"
            icon="chatbubble-ellipses-outline"
            variant="secondary"
            size="md"
            onPress={() =>
              router.dismissTo({
                pathname: '/(tabs)/stylist',
                params: {
                  draft: `Style this look: ${outfit.name} (${outfitItems
                    .map((item) => item.name)
                    .join(', ')}). What would you change?`,
                },
              })
            }
            style={styles.secondaryButton}
          />
          {latestRender ? (
            <Button
              label="Share"
              icon="share-outline"
              variant="secondary"
              size="md"
              onPress={() => shareRender(latestRender)}
              style={styles.shareButton}
            />
          ) : null}
        </View>

        <View style={styles.sectionRow}>
          <Txt variant="eyebrow" color={colors.inkFaint}>
            The pieces
          </Txt>
          <PressableScale
            onPress={() => {
              tap();
              setPicking((value) => !value);
            }}
            accessibilityLabel={picking ? 'Close piece picker' : 'Add a piece to this look'}
            style={styles.addPiece}
          >
            <Ionicons
              name={picking ? 'close' : 'add'}
              size={14}
              color={colors.ink}
            />
            <Txt variant="label" style={styles.addPieceText}>
              {picking ? 'Done' : 'Add'}
            </Txt>
          </PressableScale>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemRow}
          style={styles.itemScroll}
        >
          {outfitItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <PressableScale
                onPress={() => {
                  tap();
                  router.push({ pathname: '/item/[id]', params: { id: item.id } });
                }}
                accessibilityLabel={item.name}
              >
                <Image source={{ uri: item.thumbUri }} style={styles.itemImage} contentFit="cover" />
                <Txt variant="caption" numberOfLines={1} style={styles.itemName}>
                  {item.name}
                </Txt>
                <Txt variant="caption" color={colors.inkFaint} numberOfLines={1}>
                  {categoryLabel(item.category)}
                </Txt>
              </PressableScale>
              <PressableScale
                onPress={() => {
                  select();
                  updateItems(outfit.itemIds.filter((itemId) => itemId !== item.id)).catch(() =>
                    warn(),
                  );
                }}
                accessibilityLabel={`Remove ${item.name}`}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={12} color={colors.ink} />
              </PressableScale>
            </View>
          ))}
          {outfitItems.length === 0 ? (
            <Txt variant="callout" color={colors.inkSoft} style={styles.noPieces}>
              This look has no pieces yet.
            </Txt>
          ) : null}
        </ScrollView>

        {picking ? (
          <View style={styles.picker}>
            {remaining.length === 0 ? (
              <Txt variant="caption" color={colors.inkSoft}>
                Every piece in your wardrobe is already in this look.
              </Txt>
            ) : (
              <View style={styles.pickerGrid}>
                {remaining.map((item) => (
                  <PressableScale
                    key={item.id}
                    onPress={() => {
                      select();
                      updateItems([...outfit.itemIds, item.id]).catch(() => warn());
                    }}
                    accessibilityLabel={`Add ${item.name}`}
                    style={[styles.pickerTile, { width: tile, height: tile * 1.15 }]}
                  >
                    <Image
                      source={{ uri: item.thumbUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={140}
                    />
                    <View style={styles.pickerShade}>
                      <Txt variant="caption" color={colors.white} numberOfLines={1}>
                        {item.name}
                      </Txt>
                    </View>
                    <View style={styles.pickerPlus}>
                      <Ionicons name="add" size={13} color={colors.ink} />
                    </View>
                  </PressableScale>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {outfitRenders.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Txt variant="eyebrow" color={colors.inkFaint}>
                Lookbook
              </Txt>
              <Txt variant="caption" color={colors.inkSoft}>
                {outfitRenders.length} {outfitRenders.length === 1 ? 'render' : 'renders'}
              </Txt>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lookbookRow}
              style={styles.itemScroll}
            >
              {outfitRenders.map((render) => (
                <PressableScale
                  key={render.id}
                  onPress={() => setViewer(render)}
                  onLongPress={() => {
                    Alert.alert('Remove this render?', 'The image will be deleted from this device.', [
                      { text: 'Keep', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          removeRender(render).catch(() => warn());
                        },
                      },
                    ]);
                  }}
                  accessibilityLabel="Open rendered look"
                  style={styles.lookbookTile}
                >
                  <Image
                    source={{ uri: render.imageUri }}
                    style={styles.lookbookImage}
                    contentFit="cover"
                    transition={160}
                  />
                </PressableScale>
              ))}
            </ScrollView>
            <Txt variant="caption" color={colors.inkFaint} style={styles.longPressHint}>
              Hold a render to remove it.
            </Txt>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={Boolean(viewer)}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setViewer(null)}
      >
        <View style={styles.viewer}>
          <View style={[styles.viewerBar, { paddingTop: insets.top + 8 }]}>
            <PressableScale
              onPress={() => setViewer(null)}
              accessibilityLabel="Close"
              style={styles.viewerButton}
            >
              <Ionicons name="close" size={22} color={colors.white} />
            </PressableScale>
            <Txt variant="label" color={colors.white}>
              {outfit.name}
            </Txt>
            <PressableScale
              onPress={() => viewer && shareRender(viewer)}
              accessibilityLabel="Share this render"
              style={styles.viewerButton}
            >
              <Ionicons name="share-outline" size={20} color={colors.white} />
            </PressableScale>
          </View>
          {viewer ? (
            <Image source={{ uri: viewer.imageUri }} style={styles.viewerImage} contentFit="contain" />
          ) : null}
          <Txt
            variant="caption"
            color="rgba(255,255,255,0.55)"
            style={[styles.viewerCaption, { paddingBottom: insets.bottom + 18 }]}
          >
            {viewer?.engine ? `Rendered with ${viewer.engine}` : ''}
          </Txt>
        </View>
      </Modal>

      <PromptDialog
        visible={renaming}
        title="Rename look"
        message="A short name keeps the studio legible."
        placeholder="Look name"
        value={renameDraft}
        onChangeText={setRenameDraft}
        confirmLabel="Save"
        onCancel={() => setRenaming(false)}
        onConfirm={(name) => {
          setRenaming(false);
          editOutfit({ ...outfit, name }).then(() => success()).catch(() => warn());
        }}
      />
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
    paddingTop: 16,
  },
  heroWrap: {
    borderRadius: radius.xl,
  },
  hero: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.xl,
    backgroundColor: colors.paperDeep,
  },
  heroBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  titleBlock: {
    marginTop: 18,
    marginBottom: 18,
  },
  title: {
    marginTop: 8,
    fontSize: 30,
  },
  note: {
    marginTop: 8,
  },
  primaryAction: {
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
  },
  shareButton: {
    paddingHorizontal: 18,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
    marginLeft: 2,
  },
  addPiece: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addPieceText: {
    fontSize: 12,
  },
  itemScroll: {
    marginHorizontal: -20,
  },
  itemRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  itemCard: {
    width: 92,
  },
  itemImage: {
    width: 92,
    height: 118,
    borderRadius: radius.md,
    backgroundColor: colors.paperDeep,
  },
  itemName: {
    marginTop: 6,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(252,250,244,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPieces: {
    paddingVertical: 20,
  },
  picker: {
    marginTop: 16,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerTile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  pickerShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: 'rgba(26,24,21,0.5)',
  },
  pickerPlus: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(252,250,244,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookbookRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  lookbookTile: {
    borderRadius: radius.md,
  },
  lookbookImage: {
    width: 104,
    height: 132,
    borderRadius: radius.md,
    backgroundColor: colors.paperDeep,
  },
  longPressHint: {
    marginTop: 8,
    marginLeft: 2,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#0B0A09',
  },
  viewerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  viewerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    flex: 1,
  },
  viewerCaption: {
    textAlign: 'center',
    paddingVertical: 18,
  },
});
