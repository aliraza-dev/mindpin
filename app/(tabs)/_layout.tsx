import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabs } from '../../src/features/navigation/tabs';
import { Icon } from '../../src/ui/Icon';
import { tokens } from '../../src/ui/tokens';

// The bar is 64 px high above the phone's own bottom inset, enough for the 56 px + button.
const BAR_HEIGHT = 64;

// Bottom bar (R6.5), drawn as in the Home frame: icons only, with the + button in the middle.
// Expo Router requires a default export for route files.
export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: BAR_HEIGHT + insets.bottom,
          backgroundColor: tokens.color.surface,
          borderTopColor: tokens.color.border,
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
            tabBarIcon: ({ focused }) =>
              tab.opensRoute ? (
                // The + button keeps its own colors.
                <Icon name={tab.icon} />
              ) : (
                <Icon
                  name={tab.icon}
                  tintColor={focused ? tokens.color.text : tokens.color.mutedText}
                />
              ),
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
