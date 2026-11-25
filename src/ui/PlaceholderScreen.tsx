import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { tokens } from './tokens';

// Stand-in for screens that later tasks build. Title is a translation key.
export function PlaceholderScreen({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {t(titleKey)}
      </Text>
      <Text style={styles.body}>{t('common:placeholder.comingSoon')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.background,
    padding: tokens.screenPadding,
    justifyContent: 'center',
    gap: 8,
  },
  title: { fontFamily: tokens.font.headingBold, fontSize: 28, color: tokens.color.text },
  body: { fontFamily: tokens.font.body, fontSize: 16, color: tokens.color.mutedText },
});
