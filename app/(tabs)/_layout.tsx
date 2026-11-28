import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar } from '../../src/features/navigation/TabBar';
import { tabs } from '../../src/features/navigation/tabs';
import { useColors } from '../../src/ui/theme';

// Bottom bar (R6.5): Home, Map, Settings. Adding things is the floating + button on Home.
// The open tab's highlight glides along the bar, and the screens slide and fade into each
// other. Swiping sideways belongs to Home, where it moves between People and Places.
// Expo Router requires a default export for route files.
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
          return <TabBar activeIndex={index} onSelect={go} bottomInset={insets.bottom} />;
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.labelKey) }} />
        ))}
      </Tabs>
    </View>
  );
}
