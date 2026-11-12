import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Skeleton } from '@/components/Skeleton';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PressableScale } from '@/components/PressableScale';
import { useSettings } from '@/lib/settings';
import { searchImages } from '@/lib/ai/search';
import { AIError, friendlyError } from '@/lib/ai/client';
import type { ImageResult } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { select, tap, warn } from '@/lib/haptics';

const EXAMPLES = [
  'vintage leather bomber',
  'pleated midi skirt',
  'Margiela tabi boots',
  'oversized wool coat',
];

const RATIOS = [0.74, 0.88, 0.8, 0.96];

export default function DiscoverScreen() {
  const { settings, hasWebSearch } = useSettings();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [searched, setSearched] = useState(false);

  const run = async (override?: string) => {
    const text = (override ?? query).trim();
    if (!text || loading) return;
    tap();
    Keyboard.dismiss();
    setQuery(text);
    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);
    try {
      const found = await searchImages({
        query: text,
        cseKey: settings.cseKey,
        cseCx: settings.cseCx,
      });
      setResults(found);
      if (found.length === 0) {
        setError({
          message: 'Nothing came back.',
          detail: 'Try a more literal description — “brown leather jacket” usually beats “the perfect jacket”.',
        });
      }
    } catch (caught) {
      warn();
      const ai = caught instanceof AIError ? caught : null;
      setError({
        message: ai?.message ?? friendlyError(caught),
        detail:
          ai?.code === 'AUTH'
            ? 'Open Settings and check the Google Search key and engine id.'
            : !hasWebSearch
              ? 'Google’s free image search (100 a day) is more reliable. Add a key in Settings.'
              : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const left = results.filter((_, index) => index % 2 === 0);
  const right = results.filter((_, index) => index % 2 === 1);
  const cardWidth = (width - 40 - 10) / 2;

  return (
    <Screen
      title="Discover"
      eyebrow="The open closet"
      subtitle="Search the web. Keep the piece."
    >
      <View style={styles.searchBar}>
        <Ionicons name="search" size={19} color={colors.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => run()}
          placeholder="A piece, a feeling, a reference…"
          placeholderTextColor={colors.inkFaint}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.ink}
        />
        {query.length > 0 && !loading ? (
          <PressableScale
            onPress={() => {
              setQuery('');
              setResults([]);
              setSearched(false);
              setError(null);
            }}
            accessibilityLabel="Clear search"
            style={styles.clear}
          >
            <Ionicons name="close" size={14} color={colors.inkSoft} />
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={() => run()}
          disabled={!query.trim() || loading}
          accessibilityLabel="Search images"
          style={[
            styles.go,
            { backgroundColor: query.trim() ? colors.lime : colors.paperDeep },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Ionicons
              name="arrow-forward"
              size={18}
              color={query.trim() ? colors.limeInk : colors.inkFaint}
            />
          )}
        </PressableScale>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <ErrorNotice
            message={error.message}
            detail={error.detail}
            actionLabel={!hasWebSearch ? 'Open Settings' : 'Try again'}
            onAction={!hasWebSearch ? () => router.push('/settings') : () => run()}
          />
        </View>
      ) : null}

      {!searched && !loading ? (
        <View style={styles.intro}>
          <Txt variant="eyebrow" color={colors.inkFaint}>
            Search like a stylist
          </Txt>
          <Txt variant="title" style={styles.introTitle}>
            Find the missing piece.
          </Txt>
          <Txt variant="body" color={colors.inkSoft} style={styles.introBody}>
            Describe it the way you would to a very good salesperson. Tap an image to bring it into
            your wardrobe.
          </Txt>

          <View style={styles.examples}>
            {EXAMPLES.map((example, index) => (
              <PressableScale
                key={example}
                onPress={() => {
                  select();
                  run(example);
                }}
                accessibilityLabel={`Search for ${example}`}
                style={styles.example}
              >
                <Txt variant="caption" color={colors.inkFaint} style={styles.exampleIndex}>
                  0{index + 1}
                </Txt>
                <Txt variant="headline" style={styles.exampleText}>
                  {example}
                </Txt>
                <Ionicons name="arrow-up-outline" size={17} color={colors.inkSoft} style={styles.exampleArrow} />
              </PressableScale>
            ))}
          </View>

          <Txt variant="caption" color={colors.inkFaint} style={styles.sourceNote}>
            Images come from the open web. Nothing is downloaded until you choose it.
          </Txt>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.masonry}>
          {[0, 1].map((column) => (
            <View key={column} style={styles.column}>
              {[0, 1, 2].map((row) => (
                <Skeleton
                  key={row}
                  style={{
                    width: cardWidth,
                    aspectRatio: RATIOS[(column + row) % RATIOS.length],
                    borderRadius: radius.lg,
                  }}
                  borderRadius={radius.lg}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {!loading && results.length > 0 ? (
        <>
          <View style={styles.resultMeta}>
            <Txt variant="caption" color={colors.inkSoft}>
              {results.length} {results.length === 1 ? 'image' : 'images'}
            </Txt>
            <Txt variant="caption" color={colors.inkFaint}>
              {hasWebSearch ? 'Google image search' : 'Web image search'}
            </Txt>
          </View>
          <View style={styles.masonry}>
            {[left, right].map((column, columnIndex) => (
              <View key={columnIndex} style={styles.column}>
                {column.map((result, index) => {
                  const ratio = RATIOS[(index * 2 + columnIndex) % RATIOS.length];
                  return (
                    <Animated.View
                      key={result.id}
                      entering={FadeInDown.delay(Math.min(index * 2 + columnIndex, 6) * 26)
                        .duration(280)
                        .reduceMotion(ReduceMotion.System)}
                      style={{ width: cardWidth }}
                    >
                      <PressableScale
                        onPress={() => {
                          tap();
                          router.push({
                            pathname: '/add-item',
                            params: {
                              imageUrl: result.image,
                              thumbUrl: result.thumbnail,
                              suggestedName: result.title,
                            },
                          });
                        }}
                        accessibilityLabel={`Add ${result.title}`}
                      >
                        <View style={[styles.tile, { height: cardWidth / ratio }]}>
                          <Image
                            source={{ uri: result.thumbnail }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            transition={180}
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(11,10,9,0.66)']}
                            style={styles.tileShade}
                            pointerEvents="none"
                          />
                          <View style={styles.tileCopy}>
                            <Txt variant="caption" color="rgba(255,255,255,0.66)" numberOfLines={1}>
                              {result.source}
                            </Txt>
                            <Txt variant="caption" color={colors.white} numberOfLines={2}>
                              {result.title}
                            </Txt>
                          </View>
                          <View style={styles.addPill}>
                            <Ionicons name="add" size={14} color={colors.ink} />
                          </View>
                        </View>
                      </PressableScale>
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </View>
          <PressableScale
            onPress={() => {
              setQuery('');
              setResults([]);
              setSearched(false);
              setError(null);
            }}
            accessibilityLabel="Start a new search"
            style={styles.newSearch}
          >
            <Ionicons name="refresh" size={15} color={colors.inkSoft} />
            <Txt variant="label" color={colors.inkSoft}>
              New search
            </Txt>
          </PressableScale>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingLeft: 15,
    paddingRight: 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  clear: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  go: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    marginBottom: 18,
  },
  intro: {
    paddingTop: 4,
  },
  introTitle: {
    marginTop: 8,
  },
  introBody: {
    marginTop: 10,
    maxWidth: 330,
  },
  examples: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  exampleIndex: {
    width: 22,
  },
  exampleText: {
    flex: 1,
  },
  exampleArrow: {
    transform: [{ rotate: '45deg' }],
  },
  sourceNote: {
    marginTop: 20,
    lineHeight: 18,
  },
  masonry: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    gap: 10,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
  },
  tileShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
  },
  tileCopy: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 9,
    gap: 2,
  },
  addPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(252,250,244,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    alignSelf: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
