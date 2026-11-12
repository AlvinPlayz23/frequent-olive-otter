import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { OutfitCollage } from '@/components/OutfitCollage';
import { useLibrary } from '@/lib/library';
import type { Item } from '@/lib/types';
import { CATEGORIES, categoryLabel, timeAgo } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { select, success, tap, warn } from '@/lib/haptics';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, outfits, editItem, removeItem } = useLibrary();
  const insets = useSafeAreaInsets();

  const item = items.find((entry) => entry.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  const relatedOutfits = useMemo(
    () =>
      outfits.filter((outfit) => item && outfit.itemIds.includes(item.id)),
    [outfits, item],
  );

  const outfitsWithItems = useMemo(
    () =>
      relatedOutfits
        .map((outfit) => ({
          outfit,
          pieces: outfit.itemIds
            .map((itemId) => items.find((entry) => entry.id === itemId))
            .filter((entry): entry is Item => Boolean(entry)),
        }))
        .filter((entry) => entry.pieces.length > 0),
    [items, relatedOutfits],
  );

  if (!item) {
    return (
      <View style={styles.root}>
        <ModalHeader title="Piece" onClose={() => router.back()} />
        <EmptyState
          icon="shirt-outline"
          eyebrow="Not here"
          title="This piece is gone."
          body="It may have been removed from your wardrobe."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const startEditing = () => {
    tap();
    setDraft({ ...item });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      await editItem({ ...draft, name: draft.name.trim() });
      success();
      setEditing(false);
      setDraft(null);
    } catch {
      warn();
    } finally {
      setSaving(false);
    }
  };

  const menu = () => {
    tap();
    Alert.alert(item.name, 'What would you like to do?', [
      { text: 'Edit details', onPress: startEditing },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove from wardrobe',
        style: 'destructive',
        onPress: () => {
          removeItem(item)
            .then(() => {
              select();
              router.back();
            })
            .catch(() => warn());
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ModalHeader
        title="Piece"
        onClose={() => router.back()}
        right={
          <IconButton
            name="ellipsis-horizontal"
            accessibilityLabel="Piece options"
            onPress={menu}
          />
        }
      />

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: item.imageUri }}
            style={styles.hero}
            contentFit="contain"
            transition={200}
          />
        </View>

        <View style={styles.titleBlock}>
          <Txt variant="eyebrow" color={colors.inkFaint}>
            {categoryLabel(item.category)} · Added {timeAgo(item.createdAt).toLowerCase()}
          </Txt>
          <Txt variant="title" style={styles.title}>
            {item.name}
          </Txt>
          {item.brand || item.color ? (
            <Txt variant="callout" color={colors.inkSoft} style={styles.meta}>
              {[item.brand, item.color].filter(Boolean).join(' · ')}
            </Txt>
          ) : null}
        </View>

        {!editing ? (
          <>
            <Button
              label="Style this piece"
              icon="sparkles"
              variant="accent"
              onPress={() =>
                router.dismissTo({
                  pathname: '/(tabs)/stylist',
                  params: {
                    draft: `Build a look around my ${item.name}${
                      item.color ? ` in ${item.color}` : ''
                    }.`,
                  },
                })
              }
            />
            <Button
              label="Add to a new look"
              icon="albums-outline"
              variant="secondary"
              size="md"
              onPress={() =>
                router.push({ pathname: '/compose', params: { preselect: item.id } })
              }
              style={styles.secondary}
            />

            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <Txt variant="eyebrow" color={colors.inkFaint}>
                  Details
                </Txt>
                <PressableScale
                  onPress={startEditing}
                  accessibilityLabel="Edit this piece"
                  style={styles.editButton}
                >
                  <Txt variant="label" color={colors.inkSoft}>
                    Edit
                  </Txt>
                </PressableScale>
              </View>
              <DetailRow label="Category" value={categoryLabel(item.category)} />
              <DetailRow label="Colour" value={item.color || '—'} />
              <DetailRow label="Brand" value={item.brand || '—'} />
              <DetailRow label="Source" value={sourceLabel(item.source)} last />
            </View>
          </>
        ) : draft ? (
          <View style={styles.editCard}>
            <Txt variant="eyebrow" color={colors.inkFaint}>
              Edit the piece
            </Txt>
            <Field
              label="Name"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
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
                  active={draft.category === entry.key}
                  onPress={() => {
                    select();
                    setDraft({ ...draft, category: entry.key });
                  }}
                />
              ))}
            </View>
            <View style={styles.twoUp}>
              <Field
                label="Colour"
                value={draft.color ?? ''}
                onChangeText={(color) => setDraft({ ...draft, color })}
                placeholder="Ecru"
                containerStyle={styles.half}
              />
              <Field
                label="Brand"
                value={draft.brand ?? ''}
                onChangeText={(brand) => setDraft({ ...draft, brand })}
                placeholder="Optional"
                containerStyle={styles.half}
              />
            </View>
            <View style={styles.editActions}>
              <Button
                label="Save changes"
                variant="ink"
                size="md"
                onPress={saveEdit}
                loading={saving}
                disabled={!draft.name.trim()}
                style={styles.saveEdit}
              />
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={() => {
                  setEditing(false);
                  setDraft(null);
                }}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.sectionRow}>
          <Txt variant="eyebrow" color={colors.inkFaint}>
            In your looks
          </Txt>
          <Txt variant="caption" color={colors.inkSoft}>
            {outfitsWithItems.length}
          </Txt>
        </View>

        {outfitsWithItems.length === 0 ? (
          <Txt variant="callout" color={colors.inkSoft}>
            This piece isn’t in a look yet. Compose one around it and see it on a model.
          </Txt>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lookRow}
            style={styles.lookScroll}
          >
            {outfitsWithItems.map(({ outfit, pieces }) => (
              <PressableScale
                key={outfit.id}
                onPress={() => {
                  tap();
                  router.push({ pathname: '/outfit/[id]', params: { id: outfit.id } });
                }}
                accessibilityLabel={outfit.name}
                style={styles.lookCard}
              >
                <OutfitCollage
                  items={pieces}
                  style={styles.lookCover}
                  borderRadius={radius.md}
                />
                <Txt variant="caption" numberOfLines={1} style={styles.lookName}>
                  {outfit.name}
                </Txt>
              </PressableScale>
            ))}
          </ScrollView>
        )}

        <Txt variant="caption" color={colors.inkFaint} style={styles.note}>
          Your photo is stored only on this device. Remove the piece to delete it.
        </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last ? styles.detailRowBorder : null]}>
      <Txt variant="caption" color={colors.inkSoft}>
        {label}
      </Txt>
      <Txt variant="callout" style={styles.detailValue}>
        {value}
      </Txt>
    </View>
  );
}

function sourceLabel(source: Item['source']) {
  if (source === 'camera') return 'Camera';
  if (source === 'library') return 'Photo library';
  if (source === 'url') return 'Pasted link';
  return 'Web search';
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
    paddingTop: 16,
  },
  heroWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  hero: {
    width: '100%',
    aspectRatio: 0.86,
    backgroundColor: colors.paperDeep,
  },
  titleBlock: {
    marginTop: 18,
    marginBottom: 20,
  },
  title: {
    marginTop: 8,
    fontSize: 30,
  },
  meta: {
    marginTop: 7,
  },
  secondary: {
    marginTop: 8,
  },
  detailsCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 16,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  editCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  field: {
    marginTop: 14,
  },
  categoryLabel: {
    marginTop: 18,
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
  },
  half: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  saveEdit: {
    flex: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
    marginLeft: 2,
  },
  lookScroll: {
    marginHorizontal: -20,
  },
  lookRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  lookCard: {
    width: 120,
  },
  lookCover: {
    width: 120,
    height: 150,
  },
  lookName: {
    marginTop: 6,
    fontWeight: '600',
  },
  note: {
    marginTop: 24,
    lineHeight: 18,
  },
});
