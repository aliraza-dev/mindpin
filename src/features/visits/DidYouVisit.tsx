// "Did you visit?" (R5.2): asked when the app is opened at least 15 minutes after the user
// tapped Navigate on a place. MindPin does not track location, so it asks. Yes records the
// visit at the time of Navigate; No drops the question. It is asked once.
// There is no Figma frame for it; it follows the save sheet (design.md).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { logEvent } from '../../lib/log';
import { Button } from '../../ui/Button';
import { tokens } from '../../ui/tokens';
import { answerNavigatePrompt, getNavigatePrompt, type NavigatePrompt } from './navigateConfirm';

export function DidYouVisit() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState<NavigatePrompt | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const found = await getNavigatePrompt(await getDatabase());
        if (active) setPrompt(found);
      } catch {
        logEvent('visit_prompt_failed');
      }
    };
    void check();
    // Coming back to the app counts as opening it.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (!prompt) return null;

  const answer = async (visited: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await answerNavigatePrompt(await getDatabase(), visited);
    } catch {
      logEvent('visit_prompt_failed');
    } finally {
      busy.current = false;
      setPrompt(null);
    }
  };

  const label = prompt.place.title;
  const time = new Date(prompt.navigatedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Modal visible transparent statusBarTranslucent animationType="slide" onRequestClose={() => answer(false)}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>
            {t('visits:prompt.title', { label })}
          </Text>
          <Text style={styles.detail}>{t('visits:prompt.detail', { time })}</Text>
          <View style={styles.buttons}>
            <Button
              size="large"
              label={t('visits:prompt.yes')}
              accessibilityLabel={t('visits:prompt.yesA11y', { label })}
              onPress={() => answer(true)}
            />
            <Button
              size="large"
              variant="secondary"
              label={t('visits:prompt.no')}
              accessibilityLabel={t('visits:prompt.noA11y', { label })}
              onPress={() => answer(false)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(59, 63, 71, 0.6)' },
  sheet: {
    paddingHorizontal: tokens.screenPadding,
    borderTopLeftRadius: tokens.radius.saveSheet,
    borderTopRightRadius: tokens.radius.saveSheet,
    backgroundColor: tokens.color.background,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: tokens.color.inactiveDot,
  },
  title: { fontFamily: tokens.font.headingBold, fontSize: 22, color: tokens.color.text },
  detail: {
    marginTop: 8,
    fontFamily: tokens.font.body,
    fontSize: 14,
    color: tokens.color.secondaryText,
  },
  buttons: { marginTop: 23, gap: 12 },
});
