// The profile screen (owner request, 2026-11-28): the user's first name, which Home greets
// them by (R7.8), and how much they have saved. It is opened from the circle at the top of
// Home. Sign-in, backup, and the account itself arrive with their own tasks.
// There is no Figma frame for this screen; it follows the other frames (design.md).
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { logEvent } from '../../lib/log';
import { useDbQuery } from '../../lib/useDbQuery';
import { initialsOf } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { Button } from '../../ui/Button';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { TextField } from '../../ui/TextField';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { FIRST_NAME_LIMIT, loadProfile, saveFirstName, type Profile } from './profile';

export function ProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { state } = useDbQuery(loadProfile, 'profile', 'profile');

  if (state.status === 'loading') return <View style={styles.screen} />;
  if (state.status === 'error') {
    return (
      <ScreenMessage
        message={t('profile:loadFailed')}
        backLabel={t('profile:back')}
        onBack={() => router.back()}
        topInset={insets.top}
      />
    );
  }
  return (
    <ProfileForm
      profile={state.data}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onBack={() => router.back()}
    />
  );
}

type FormProps = { profile: Profile; topInset: number; bottomInset: number; onBack: () => void };

// Holds the name while it is typed. It starts from the name as saved and is not reset when
// the screen's data loads again, so nothing typed is lost.
function ProfileForm({ profile, topInset, bottomInset, onBack }: FormProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const [name, setName] = useState(profile.firstName ?? '');
  const [saved, setSaved] = useState(profile.firstName ?? '');
  const [error, setError] = useState(false);
  // Stops a double tap on Save from writing twice.
  const busy = useRef(false);

  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await saveFirstName(await getDatabase(), name);
      setError(!result.ok);
      if (!result.ok) return;
      setName(result.firstName ?? '');
      setSaved(result.firstName ?? '');
    } catch {
      // Logged by event name only: the name itself is never logged.
      logEvent('profile_save_failed');
      Alert.alert(t('profile:saveFailed'));
    } finally {
      busy.current = false;
    }
  };

  const counts = [
    { key: 'people', count: profile.people },
    { key: 'places', count: profile.places },
    { key: 'notes', count: profile.notes },
  ];
  const initial = initialsOf(saved).slice(0, 1);

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 8, paddingBottom: bottomInset + 32 },
      ]}
    >
      <BackButton onPress={onBack} accessibilityLabel={t('profile:back')} />

      <View style={styles.head}>
        <View
          testID="profile-circle"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.circle}
        >
          <Text style={styles.circleText}>{initial || t('profile:noNameMark')}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {saved || t('profile:title')}
        </Text>
        <Text style={styles.onPhone}>{t('profile:onPhone')}</Text>
      </View>

      <View style={styles.card}>
        <TextField
          label={t('profile:firstName')}
          value={name}
          onChangeText={setName}
          maxLength={FIRST_NAME_LIMIT}
          autoCapitalize="words"
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={save}
          hint={t('profile:firstNameHint')}
          error={error ? t('profile:tooLong') : undefined}
        />
        <Button
          size="large"
          label={t('profile:save')}
          accessibilityLabel={t('profile:saveA11y')}
          onPress={save}
          disabled={name.replace(/\s+/g, ' ').trim() === saved}
        />
      </View>

      <View style={styles.counts}>
        {counts.map(({ key, count }) => (
          <View
            key={key}
            accessible
            accessibilityLabel={t(`profile:counts.${key}A11y`, { count })}
            style={styles.count}
          >
            <Text style={styles.countNumber}>{count}</Text>
            <Text style={styles.countLabel}>{t(`profile:counts.${key}`, { count })}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.later}>{t('profile:later')}</Text>
    </ScrollView>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding },
    head: { marginTop: 8, alignItems: 'center', gap: 6 },
    circle: {
      width: tokens.size.avatarLarge,
      height: tokens.size.avatarLarge,
      borderRadius: tokens.size.avatarLarge / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    circleText: { fontFamily: tokens.font.headingBold, fontSize: 28, color: colors.onAccent },
    title: { marginTop: 6, fontFamily: tokens.font.headingBold, fontSize: 24, color: colors.text },
    onPhone: {
      fontFamily: tokens.font.body,
      fontSize: 13,
      color: colors.mutedText,
      textAlign: 'center',
    },
    card: {
      marginTop: 22,
      padding: 14,
      gap: 14,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    counts: { marginTop: 14, flexDirection: 'row', gap: 10 },
    count: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 2,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    countNumber: { fontFamily: tokens.font.headingBold, fontSize: 22, color: colors.text },
    countLabel: { fontFamily: tokens.font.body, fontSize: 13, color: colors.secondaryText },
    later: {
      marginTop: 18,
      fontFamily: tokens.font.body,
      fontSize: 13,
      color: colors.mutedText,
      textAlign: 'center',
    },
  }),
);
