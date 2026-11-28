import { Tabs } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, PanResponder, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isTabSwipe, tabAfterSwipe } from '../../src/features/navigation/swipeTabs';
import { TabBar } from '../../src/features/navigation/TabBar';
import { tabs } from '../../src/features/navigation/tabs';
import { useColors } from '../../src/ui/theme';

// Bottom bar (R6.5): Home, Map, Settings. Adding things is the floating + button on Home.
// A sideways swipe anywhere on a tab screen moves to the tab beside it; a list row that
// slides for its own actions, and the map, keep their own gestures because they take the
// touch first.
// Expo Router requires a default export for route files.
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Made once: what the swipe needs to know (which tab is open, and how to open another),
  // and the gesture that reads it. The bar is handed both by the navigator and stores them.
  const [{ open, swipe }] = useState(() => {
    const box: { index: number; go: (index: number) => void } = { index: 0, go: () => {} };
    const pan = PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => isTabSwipe(gesture),
      onPanResponderRelease: (_event, gesture) => {
        const next = tabAfterSwipe(box.index, tabs.length, gesture, I18nManager.isRTL);
        if (next !== box.index) box.go(next);
      },
    });
    return { open: box, swipe: pan };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} {...swipe.panHandlers}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // The screens slide and fade into each other instead of cutting.
          animation: 'shift',
          sceneStyle: { backgroundColor: colors.background },
        }}
        tabBar={({ state, navigateToTab }) => {
          const index = Math.max(
            0,
            tabs.findIndex((tab) => tab.name === state.routes[state.index]?.name),
          );
          const go = (to: number) => {
            const route = state.routes.find((entry) => entry.name === tabs[to].name);
            if (route) navigateToTab(route.key);
          };
          return (
            <TabBar
              activeIndex={index}
              onSelect={go}
              bottomInset={insets.bottom}
              onReady={(current) => {
                open.index = current;
                open.go = go;
              }}
            />
          );
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.labelKey) }} />
        ))}
      </Tabs>
    </View>
  );
}
