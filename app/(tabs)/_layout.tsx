import { Tabs, useRouter, useSegments } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BAR_HEIGHT, TabBar } from '../../src/features/navigation/TabBar';
import { TabBarSpace } from '../../src/features/navigation/tabBarSpace';
import { tabs } from '../../src/features/navigation/tabs';
import { BlurTarget, type ViewRef } from '../../src/ui/blur';
import { useColors } from '../../src/ui/theme';

// Bottom bar (R6.5): Home, Map, Settings. Adding things is the floating + button on Home.
// The bar floats over the screens and is drawn here, outside them, so that it can blur what
// is behind it: the blur may not sit inside the thing it blurs. The screens slide and fade
// into each other. Swiping sideways belongs to Home, where it moves between People and Places.
// Expo Router requires a default export for route files.
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const behind = useRef<ViewRef>(null);
  // ['(tabs)'] on Home, ['(tabs)', 'map'] on the map.
  const open = (useSegments() as string[])[1] ?? 'index';
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.name === open),
  );
  const go = (to: number) => {
    const name = tabs[to].name;
    router.navigate(name === 'index' ? '/' : `/${name}`);
  };

  return (
    <TabBarSpace.Provider value={BAR_HEIGHT + insets.bottom}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <BlurTarget ref={behind} style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              // The screens slide and fade into each other instead of cutting.
              animation: 'shift',
              sceneStyle: { backgroundColor: colors.background },
            }}
            tabBar={() => null}
          >
            {tabs.map((tab) => (
              <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.labelKey) }} />
            ))}
          </Tabs>
        </BlurTarget>
        <TabBar activeIndex={index} onSelect={go} bottomInset={insets.bottom} blurTarget={behind} />
      </View>
    </TabBarSpace.Provider>
  );
}
