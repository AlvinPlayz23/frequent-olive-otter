import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { LibraryProvider, useLibrary } from '@/lib/library';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function LoadingMark() {
  return (
    <View style={styles.loading}>
      <Txt variant="eyebrow" color={colors.inkFaint}>
        Atelier
      </Txt>
      <Txt style={styles.mark}>A</Txt>
      <View style={styles.dot} />
    </View>
  );
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const { ready, initError, retry } = useLibrary();
  const { loaded } = useSettings();
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded && loaded && (ready || initError)) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, loaded, ready, initError]);

  if (!fontsLoaded || !loaded) return <View style={styles.loading} />;

  if (initError) {
    return (
      <View style={styles.errorPage}>
        <Txt variant="eyebrow" color={colors.danger}>
          The wardrobe won’t open
        </Txt>
        <Txt variant="title" style={styles.errorTitle}>
          Something is in the way.
        </Txt>
        <Txt variant="body" color={colors.inkSoft} style={styles.errorBody}>
          {initError}
        </Txt>
        <Txt variant="caption" color={colors.inkFaint} style={styles.errorBody}>
          Close and reopen the app to try again.
        </Txt>
        <Button
          label="Try again"
          onPress={() => {
            retry().catch(() => undefined);
          }}
          variant="secondary"
          size="md"
          style={styles.errorButton}
        />
      </View>
    );
  }

  if (!ready) return <LoadingMark />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SettingsProvider>
          <LibraryProvider>
            <StatusBar style="dark" />
            <Bootstrap>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.paper },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="add-item"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="compose"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="item/[id]"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="outfit/[id]"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="try-on"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="personas"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="settings"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
              </Stack>
            </Bootstrap>
          </LibraryProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mark: {
    fontSize: 78,
    lineHeight: 86,
    fontWeight: '700',
    letterSpacing: -3,
    color: colors.ink,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.limeDeep,
    marginTop: 2,
  },
  errorPage: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  errorTitle: {
    marginTop: 10,
  },
  errorBody: {
    marginTop: 10,
  },
  errorButton: {
    alignSelf: 'flex-start',
    marginTop: 22,
  },
});
