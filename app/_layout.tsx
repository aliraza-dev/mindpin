import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { getLocales } from 'expo-localization';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, View } from 'react-native';

import { purgeDeletedNotesAtStart } from '../src/features/notes/purge';
import { DidYouVisit } from '../src/features/visits/DidYouVisit';
import { loadThemePreference } from '../src/features/settings/themePreference';
import { startBackgroundLookups } from '../src/features/save/lookups';
import { initI18n } from '../src/i18n';
import { useColors, useScheme } from '../src/ui/theme';

// Allow right-to-left layout so Urdu can be added later (non-functional: languages).
I18nManager.allowRTL(true);

// Expo Router requires a default export for route files.
export default function RootLayout() {
  const colors = useColors();
  const scheme = useScheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n(getLocales()[0]?.languageCode ?? 'en').then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    const background = startBackgroundLookups();
    void purgeDeletedNotesAtStart();
    void loadThemePreference();
    return () => background.stop();
  }, []);

  if (!fontsLoaded || !i18nReady) return null;

  return (
    <View testID="app-root" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />
      <DidYouVisit />
    </View>
  );
}
