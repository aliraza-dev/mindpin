import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabs } from '../../src/features/navigation/tabs';
import { tokens } from '../../src/ui/tokens';

// Bottom bar (R6.5). Expo Router requires a default export for route files.
export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.accent,
        tabBarInactiveTintColor: tokens.color.mutedText,
        tabBarStyle: { minHeight: tokens.minTouchTarget + 16 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarAccessibilityLabel: t(tab.accessibilityKey),
          }}
          listeners={
            tab.opensRoute
              ? {
                  tabPress: (event) => {
                    event.preventDefault();
                    router.push(tab.opensRoute!);
                  },
                }
              : undefined
          }
        />
      ))}
    </Tabs>
  );
}
