import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { IconButton } from '@/components/IconButton';
import { OutfitCollage } from '@/components/OutfitCollage';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { useLibrary } from '@/lib/library';
import type { Item, Outfit, Render } from '@/lib/types';
import { colors, radius, shadows } from '@/lib/theme';
import { tap } from '@/lib/haptics';

export default function StudioScreen() {
  const { outfits, items, renders } = useLibrary();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(140, (width - 52) / 2);
  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const renderByOutfit = useMemo(() => {
    const map = new Map<string, Render>();
    renders.forEach((render) => {
      if (!map.has(render.outfitId)) map.set(render.outfitId, render);
    });
    return map;
  }, [renders]);

  const subtitle = `${outfits.length} ${outfits.length === 1 ? 'look' : 'looks'} · ${
    items.length
  } ${items.length === 1 ? 'piece' : 'pieces'} to work with`;

  return (
    <Screen
      title="Studio"
      eyebrow="Compose"
      subtitle={subtitle}
      right={
        <IconButton
          name="add"
          tone="ink"
          accessibilityLabel="Compose a look"
          onPress={() => router.push('/compose')}
          disabled={items.length === 0}
        />
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          eyebrow="The studio is quiet"
          title="A look needs a piece."
          body="Add a few things to your wardrobe first. Then compose them here and see the whole outfit on a model."
          actionLabel="Add a piece"
          onAction={() => router.push('/add-item')}
        />
      ) : (
        <>
          <PressableScale
            onPress={() => {
              tap();
              router.push('/compose');
            }}
            style={styles.composer}
            accessibilityLabel="Compose a new look"
          >
            <View style={styles.composerCopy}>
              <Txt variant="eyebrow" color={colors.lime}>
                New look
              </Txt>
              <Txt variant="title" color={colors.paper} style={styles.composerTitle}>
                Compose something.
              </Txt>
              <Txt variant="callout" color="rgba(244,240,231,0.66)" style={styles.composerBody}>
                Start from the pieces you already own.
              </Txt>
            </View>
            <View style={styles.composerPlus}>
              <Ionicons name="add" size={24} color={colors.limeInk} />
            </View>
          </PressableScale>

          {outfits.length === 0 ? (
            <View style={styles.emptyLooks}>
              <Txt variant="eyebrow" color={colors.inkFaint} style={styles.emptyEyebrow}>
                No looks yet
              </Txt>
              <Txt variant="headline" color={colors.inkSoft} style={styles.emptyLooksBody}>
                Pair a top with a bottom, add shoes, and save it here. The studio keeps every look
                ready for a try-on.
              </Txt>
            </View>
          ) : (
            <View style={styles.grid}>
              {outfits.map((outfit, index) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  items={outfit.itemIds
                    .map((id) => itemsById.get(id))
                    .filter((item): item is Item => Boolean(item))}
                  render={renderByOutfit.get(outfit.id)}
                  width={cardWidth}
                  index={index}
                />
              ))}
            </View>
          )}
        </>
      )}

      {renders.length > 0 ? (
        <View style={styles.lookbookNote}>
          <Ionicons name="sparkles" size={13} color={colors.inkFaint} />
          <Txt variant="caption" color={colors.inkFaint}>
            {renders.length} {renders.length === 1 ? 'render' : 'renders'} in your lookbook
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}

function OutfitCard({
  outfit,
  items,
  render,
  width,
  index,
}: {
  outfit: Outfit;
  items: Item[];
  render?: Render;
  width: number;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 34)
        .duration(300)
        .reduceMotion(ReduceMotion.System)}
      style={{ width }}
    >
      <PressableScale
        onPress={() => {
          tap();
          router.push({ pathname: '/outfit/[id]', params: { id: outfit.id } });
        }}
        accessibilityLabel={`${outfit.name}, ${items.length} pieces`}
      >
        {render ? (
          <View style={[styles.cover, { width, height: width * 1.28 }]}>
            <Image
              source={{ uri: render.imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color={colors.limeInk} />
              <Txt variant="caption" color={colors.limeInk} style={styles.aiBadgeText}>
                Rendered
              </Txt>
            </View>
          </View>
        ) : (
          <OutfitCollage
            items={items}
            style={{ width, height: width * 1.28 }}
            borderRadius={radius.lg}
          />
        )}
        <Txt variant="callout" numberOfLines={1} style={styles.name}>
          {outfit.name}
        </Txt>
        <Txt variant="caption" color={colors.inkSoft}>
          {items.length} {items.length === 1 ? 'piece' : 'pieces'}
          {outfit.note ? ` · ${outfit.note}` : ''}
        </Txt>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    marginBottom: 22,
    ...shadows.card,
  },
  composerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  composerTitle: {
    marginTop: 8,
    color: colors.paper,
  },
  composerBody: {
    marginTop: 4,
  },
  composerPlus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cover: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  aiBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    height: 24,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  name: {
    marginTop: 9,
    fontWeight: '600',
  },
  emptyLooks: {
    paddingTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  emptyEyebrow: {
    marginBottom: 8,
  },
  emptyLooksBody: {
    fontWeight: '500',
    lineHeight: 26,
  },
  lookbookNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 26,
  },
});
