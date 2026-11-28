import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabs } from '../../src/features/navigation/tabs';
import { TabIcon } from '../../src/ui/TabIcon';
import { useColors } from '../../src/ui/theme';

// The bar is 64 px high above the phone's own bottom inset.
const BAR_HEIGHT = 64;

// Bottom bar (R6.5): icons only. Adding things is the floating + button on Home.
// Expo Router requires a default export for route files.
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: BAR_HEIGHT + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: { height: BAR_HEIGHT, justifyContent: 'center' },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarAccessibilityLabel: t(tab.accessibilityKey),
            tabBarIcon: ({ focused }) => <TabIcon icon={tab.icon} active={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
