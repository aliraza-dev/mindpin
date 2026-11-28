// Settings. For now it holds only the theme choice (R11.6); backup, export, sign-out, and
// account deletion arrive with their own tasks (T122).
// There is no Figma frame for this screen; it follows the other frames (design.md).
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../../ui/Chip';
import { themed, useThemePreference, type ThemePreference } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { chooseTheme } from './themePreference';

const CHOICES: ThemePreference[] = ['system', 'light', 'dark'];

export function SettingsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const preference = useThemePreference();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 11 }]}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {t('settings:title')}
      </Text>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.label}>
          {t('settings:appearance.title')}
        </Text>
        <View style={styles.chips}>
          {CHOICES.map((choice) => (
            <Chip
              key={choice}
              label={t(`settings:appearance.${choice}`)}
              accessibilityLabel={t(`settings:appearance.${choice}A11y`)}
              selected={preference === choice}
              onPress={() => void chooseTheme(choice)}
            />
          ))}
        </View>
        <Text style={styles.note}>{t('settings:appearance.note')}</Text>
      </View>

      <Text style={styles.later}>{t('settings:later')}</Text>
    </ScrollView>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding, paddingBottom: 32 },
    title: { fontFamily: tokens.font.headingBold, fontSize: 28, color: colors.text },
    card: {
      marginTop: 18,
      padding: 14,
      gap: 12,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    label: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    note: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    later: {
      marginTop: 18,
      fontFamily: tokens.font.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.mutedText,
    },
  }),
);
