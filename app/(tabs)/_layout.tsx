import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabs } from '../../src/features/navigation/tabs';
import { Icon } from '../../src/ui/Icon';
import { useColors, useScheme } from '../../src/ui/theme';

// The bar is 64 px high above the phone's own bottom inset, enough for the 56 px + button.
const BAR_HEIGHT = 64;

// Bottom bar (R6.5), drawn as in the Home frame: icons only, with the + button in the middle.
// Expo Router requires a default export for route files.
export default function TabsLayout() {
  const colors = useColors();
  const scheme = useScheme();
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
            tabBarIcon: ({ focused }) =>
              tab.opensRoute ? (
                scheme === 'dark' ? (
                  // The + button's own file is teal; in the dark theme it is drawn in the accent.
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.accent,
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        width: 20,
                        height: 2.5,
                        borderRadius: 2,
                        backgroundColor: colors.onAccent,
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        width: 2.5,
                        height: 20,
                        borderRadius: 2,
                        backgroundColor: colors.onAccent,
                      }}
                    />
                  </View>
                ) : (
                  <Icon name={tab.icon} />
                )
              ) : (
                <Icon name={tab.icon} tintColor={focused ? colors.text : colors.mutedText} />
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
