import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { getLocales } from 'expo-localization';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { I18nManager, View } from 'react-native';

import { initI18n } from '../src/i18n';
import { tokens } from '../src/ui/tokens';

// Allow right-to-left layout so Urdu can be added later (non-functional: languages).
I18nManager.allowRTL(true);

// Expo Router requires a default export for route files.
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n(getLocales()[0]?.languageCode ?? 'en').then(() => setI18nReady(true));
  }, []);

  if (!fontsLoaded || !i18nReady) return null;

  return (
    <View testID="app-root" style={{ flex: 1, backgroundColor: tokens.color.background }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
