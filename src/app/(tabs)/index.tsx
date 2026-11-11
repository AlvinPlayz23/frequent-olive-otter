import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { useLibrary } from '@/lib/library';
import type { Category, Item } from '@/lib/types';
import { CATEGORIES as categories, categoryLabel, categoryPlural } from '@/lib/types';
import { colors, radius, shadows, tabBarSpace } from '@/lib/theme';
import { tap } from '@/lib/haptics';

type Filter = 'all' | Category;

export default function WardrobeScreen() {
  const { items, outfits } = useLibrary();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.category === filter)),
    [filter, items],
  );

  const cardWidth = Math.max(140, (width - 52) / 2);
  const subtitle = `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} · ${
    outfits.length
  } ${outfits.length === 1 ? 'look' : 'looks'}`;

  return (
    <View style={styles.root}>
      <Screen
        title="Wardrobe"
        eyebrow="Your collection"
        subtitle={subtitle}
        right={
          <IconButton
            name="settings-outline"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyWardrobe />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContent}
              style={styles.filterScroll}
            >
              <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
              {categories.map((category) => (
                <Chip
                  key={category.key}
                  label={category.plural}
                  active={filter === category.key}
                  onPress={() => setFilter(category.key)}
                />
              ))}
            </ScrollView>

            <View style={styles.grid}>
              {filtered.map((item, index) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  width={cardWidth}
                  index={index}
                />
              ))}
            </View>

            {filtered.length === 0 ? (
              <Txt variant="callout" color={colors.inkSoft} style={styles.noResults}>
                Nothing in {filter === 'all' ? 'your wardrobe' : categoryPlural(filter)} yet.
              </Txt>
            ) : null}
          </>
        )}
      </Screen>

      {items.length > 0 ? (
        <PressableScale
          accessibilityLabel="Add a piece"
          onPress={() => {
            tap();
            router.push('/add-item');
          }}
          scaleTo={0.93}
          style={[
            styles.fab,
            { bottom: tabBarSpace(insets.bottom) - 6 },
          ]}
        >
          <Ionicons name="add" size={28} color={colors.limeInk} />
        </PressableScale>
      ) : null}
    </View>
  );
}

function ItemCard({ item, width, index }: { item: Item; width: number; index: number }) {
  const detail = [item.brand, item.color].filter(Boolean).join(' · ');
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 7) * 30)
        .duration(300)
        .reduceMotion(ReduceMotion.System)}
      style={{ width }}
    >
      <PressableScale
        onPress={() => {
          tap();
          router.push({ pathname: '/item/[id]', params: { id: item.id } });
        }}
        accessibilityLabel={`${item.name}, ${categoryLabel(item.category)}`}
      >
        <View style={[styles.imageWrap, { width, height: width * 1.3 }]}>
          <Image
            source={{ uri: item.thumbUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
          <View style={styles.badge}>
            <Txt variant="caption" style={styles.badgeText}>
              {categoryLabel(item.category)}
            </Txt>
          </View>
        </View>
        <Txt variant="callout" numberOfLines={1} style={styles.itemName}>
          {item.name}
        </Txt>
        <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
          {detail || categoryLabel(item.category)}
        </Txt>
      </PressableScale>
    </Animated.View>
  );
}

function EmptyWardrobe() {
  return (
    <View>
      <View style={styles.emptyCard}>
        <View style={styles.art}>
          <View
            style={[
              styles.artSheet,
              styles.artLeft,
              { backgroundColor: colors.clayWash, borderColor: 'rgba(190,106,74,0.35)' },
            ]}
          />
          <View
            style={[
              styles.artSheet,
              styles.artRight,
              { backgroundColor: colors.indigoWash, borderColor: 'rgba(49,65,90,0.28)' },
            ]}
          />
          <View
            style={[
              styles.artSheet,
              styles.artCenter,
              { backgroundColor: colors.limeWash, borderColor: 'rgba(183,226,79,0.8)' },
            ]}
          >
            <Ionicons name="shirt-outline" size={32} color={colors.inkSoft} />
          </View>
        </View>

        <Txt variant="eyebrow" color={colors.inkFaint} style={styles.emptyEyebrow}>
          An empty rail
        </Txt>
        <Txt variant="title" style={styles.emptyTitle}>
          Start with one good piece.
        </Txt>
        <Txt variant="body" color={colors.inkSoft} style={styles.emptyBody}>
          Photograph something you love, pull it from your camera roll, paste a link, or find it on
          the web. Atelier builds the rest around it.
        </Txt>
        <Button
          label="Add your first piece"
          icon="add"
          variant="accent"
          onPress={() => router.push('/add-item')}
          style={styles.emptyButton}
        />
      </View>

      <View style={styles.steps}>
        {[
          ['01', 'Add what you own'],
          ['02', 'Compose a look'],
          ['03', 'See it on'],
        ].map(([number, label]) => (
          <View key={number} style={styles.step}>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              {number}
            </Txt>
            <Txt variant="label" color={colors.inkSoft}>
              {label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  filterScroll: {
    marginHorizontal: -20,
    marginBottom: 20,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(252,250,244,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  itemName: {
    marginTop: 9,
    fontWeight: '600',
  },
  noResults: {
    marginTop: 26,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  emptyCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 26,
    alignItems: 'center',
    ...shadows.card,
  },
  art: {
    height: 132,
    width: 200,
    marginBottom: 18,
  },
  artSheet: {
    position: 'absolute',
    width: 78,
    height: 108,
    borderRadius: radius.md,
    borderWidth: 1,
    top: 12,
    left: 61,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLeft: {
    transform: [{ rotate: '-11deg' }, { translateX: -38 }],
  },
  artRight: {
    transform: [{ rotate: '10deg' }, { translateX: 38 }],
  },
  artCenter: {
    transform: [{ rotate: '-1deg' }],
  },
  emptyEyebrow: {
    marginBottom: 10,
  },
  emptyTitle: {
    textAlign: 'center',
    maxWidth: 250,
  },
  emptyBody: {
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  emptyButton: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
  steps: {
    marginTop: 22,
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
});
