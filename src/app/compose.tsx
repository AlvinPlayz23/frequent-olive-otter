import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/ModalHeader';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { useLibrary } from '@/lib/library';
import { categoryLabel, type Item } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { select, success, warn } from '@/lib/haptics';

export default function ComposeScreen() {
  const { items, outfits, addOutfit } = useLibrary();
  const params = useLocalSearchParams<{ preselect?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tile = Math.max(94, (width - 40 - 16) / 3);

  const [selected, setSelected] = useState<string[]>(() =>
    params.preselect && items.some((item) => item.id === params.preselect)
      ? [params.preselect]
      : [],
  );
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const toggle = (item: Item) => {
    select();
    setSelected((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
    );
  };

  const save = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const outfit = await addOutfit({
        name: name.trim() || `Look ${String(outfits.length + 1).padStart(2, '0')}`,
        itemIds: selected,
      });
      success();
      router.replace({ pathname: '/outfit/[id]', params: { id: outfit.id } });
    } catch {
      warn();
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ModalHeader title="New look" onClose={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              eyebrow="Nothing to pull"
              title="The rail is empty."
              body="Add a few pieces to your wardrobe, then return here to compose them."
              actionLabel="Add a piece"
              onAction={() => router.push('/add-item')}
            />
          ) : (
            <>
              <Txt variant="eyebrow" color={colors.inkFaint}>
                Compose
              </Txt>
              <Txt variant="title" style={styles.heading}>
                Build the look.
              </Txt>
              <Txt variant="body" color={colors.inkSoft} style={styles.lede}>
                Pick the pieces in the order you would put them on. You can change the look at any
                time.
              </Txt>

              <Field
                label="Name"
                placeholder={`Look ${String(outfits.length + 1).padStart(2, '0')}`}
                hint="Optional — we’ll number it for you."
                value={name}
                onChangeText={setName}
                returnKeyType="done"
                containerStyle={styles.nameField}
              />

              <View style={styles.sectionRow}>
                <Txt variant="eyebrow" color={colors.inkFaint}>
                  Pieces
                </Txt>
                <Txt variant="caption" color={colors.inkSoft}>
                  {selected.length} selected
                </Txt>
              </View>

              <View style={styles.grid}>
                {items.map((item) => {
                  const order = selected.indexOf(item.id);
                  const active = order >= 0;
                  return (
                    <PressableScale
                      key={item.id}
                      onPress={() => toggle(item)}
                      scaleTo={0.95}
                      accessibilityLabel={`${item.name}, ${active ? 'selected' : 'not selected'}`}
                      style={[
                        styles.tile,
                        { width: tile, height: tile * 1.26 },
                        active ? styles.tileActive : null,
                      ]}
                    >
                      <Image
                        source={{ uri: item.thumbUri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={140}
                      />
                      <View style={styles.tileShade}>
                        <Txt variant="caption" color={colors.white} numberOfLines={1}>
                          {item.name}
                        </Txt>
                        <Txt
                          variant="caption"
                          color="rgba(255,255,255,0.7)"
                          style={styles.tileMeta}
                          numberOfLines={1}
                        >
                          {categoryLabel(item.category)}
                        </Txt>
                      </View>
                      {active ? (
                        <View style={styles.orderBadge}>
                          <Txt variant="caption" color={colors.limeInk} style={styles.orderText}>
                            {order + 1}
                          </Txt>
                        </View>
                      ) : (
                        <View style={styles.addBadge}>
                          <Ionicons name="add" size={14} color={colors.ink} />
                        </View>
                      )}
                    </PressableScale>
                  );
                })}
              </View>

              {selected.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedRow}
                  style={styles.selectedScroll}
                >
                  {selected.map((id, index) => {
                    const item = itemsById.get(id);
                    if (!item) return null;
                    return (
                      <View key={id} style={styles.selectedChip}>
                        <Txt variant="caption" color={colors.inkSoft}>
                          {index + 1}
                        </Txt>
                        <Image
                          source={{ uri: item.thumbUri }}
                          style={styles.selectedThumb}
                          contentFit="cover"
                        />
                        <Txt variant="caption" numberOfLines={1} style={styles.selectedName}>
                          {item.name}
                        </Txt>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : null}
            </>
          )}
        </ScrollView>

        {items.length > 0 ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 12) + 2 },
            ]}
          >
            <View style={styles.footerCopy}>
              <Txt variant="label">{selected.length} pieces</Txt>
              <Txt variant="caption" color={colors.inkFaint}>
                {selected.length === 0 ? 'Tap a piece to start' : 'Ready to save'}
              </Txt>
            </View>
            <Button
              label="Save look"
              icon="checkmark"
              variant="accent"
              size="md"
              onPress={save}
              loading={saving}
              disabled={selected.length === 0 || items.length === 0}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
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
    paddingBottom: 28,
  },
  heading: {
    marginTop: 8,
  },
  lede: {
    marginTop: 10,
    maxWidth: 320,
  },
  nameField: {
    marginTop: 22,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileActive: {
    borderColor: colors.ink,
  },
  tileShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 7,
    paddingTop: 18,
    paddingBottom: 6,
    backgroundColor: 'rgba(26,24,21,0.52)',
  },
  tileMeta: {
    fontSize: 10,
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(252,250,244,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedScroll: {
    marginTop: 20,
    marginHorizontal: -20,
  },
  selectedRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingLeft: 9,
    paddingRight: 12,
  },
  selectedThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.paperDeep,
  },
  selectedName: {
    maxWidth: 110,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  footerCopy: {
    gap: 2,
  },
});
