// Settings: the way to the profile, the theme choice (R11.6), what MindPin does with the
// user's data (R8.1, R8.5), and the app's version. Backup, export, sign-out, and account
// deletion arrive with their own tasks (T122).
// There is no Figma frame for this screen; it follows the other frames (design.md).
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSetting } from '../../db/settings';
import { useDbQuery } from '../../lib/useDbQuery';
import { initialsOf } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { themed, useThemePreference, type ThemePreference } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { useTabBarSpace } from '../navigation/tabBarSpace';
import { chooseTheme } from './themePreference';

const CHOICES: ThemePreference[] = ['system', 'light', 'dark'];
const PROMISES = ['onPhone', 'contacts', 'location'] as const;

export function SettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const preference = useThemePreference();
  const { state } = useDbQuery((db) => getSetting(db, 'user_first_name'), 'name', 'settings');
  const firstName = state.status === 'ready' ? state.data : null;
  const version = Constants.expoConfig?.version;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 11, paddingBottom: 32 + barSpace },
      ]}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {t('settings:title')}
      </Text>

      {/* The way to the profile. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings:profile.openA11y')}
        onPress={() => router.push('/profile')}
        style={[styles.card, styles.profile]}
      >
        <View style={styles.circle}>
          <Text style={styles.circleText}>
            {firstName ? initialsOf(firstName).slice(0, 1) : t('settings:profile.noNameMark')}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.label} numberOfLines={1}>
            {firstName ?? t('settings:profile.title')}
          </Text>
          <Text style={styles.note}>{t('settings:profile.detail')}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

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

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.label}>
          {t('settings:privacy.title')}
        </Text>
        {PROMISES.map((promise) => (
          <View key={promise} style={styles.promise}>
            <View style={styles.dot} />
            <Text style={styles.promiseText}>{t(`settings:privacy.${promise}`)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.label}>
          {t('settings:about.title')}
        </Text>
        <Text style={styles.note}>{t('settings:about.tagline')}</Text>
        {version ? (
          <Text style={styles.note}>{t('settings:about.version', { version })}</Text>
        ) : null}
      </View>

      <Text style={styles.later}>{t('settings:later')}</Text>
    </ScrollView>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding },
    title: { fontFamily: tokens.font.headingBold, fontSize: 28, color: colors.text },
    card: {
      marginTop: 14,
      padding: 14,
      gap: 12,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    profile: { marginTop: 18, flexDirection: 'row', alignItems: 'center' },
    circle: {
      width: tokens.size.avatar,
      height: tokens.size.avatar,
      borderRadius: tokens.size.avatar / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    circleText: { fontFamily: tokens.font.bodyBold, fontSize: 16, color: colors.onAccent },
    profileText: { flex: 1, gap: 2 },
    chevron: { fontFamily: tokens.font.body, fontSize: 22, color: colors.mutedText },
    label: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    note: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    promise: { flexDirection: 'row', gap: 10 },
    dot: {
      marginTop: 7,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    promiseText: {
      flex: 1,
      fontFamily: tokens.font.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.secondaryText,
    },
    later: {
      marginTop: 18,
      fontFamily: tokens.font.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.mutedText,
    },
  }),
);
