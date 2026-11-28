// The bar shown for 5 seconds after a note is deleted (R10.10). The Notes screen decides when
// it is shown; this only draws it. It uses the dark card colors (design.md).
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '../../ui/tokens';

type Props = { onUndo: () => void; bottomInset?: number };

export function UndoDeleteBar({ onUndo, bottomInset = 0 }: Props) {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="alert" style={[styles.bar, { bottom: bottomInset + 16 }]}>
      <Text style={styles.message}>{t('notes:undo.message')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notes:undo.actionA11y')}
        onPress={onUndo}
        style={styles.action}
      >
        <Text style={styles.actionText}>{t('notes:undo.action')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    start: tokens.screenPadding,
    end: tokens.screenPadding,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: 19,
    paddingEnd: 5,
    borderRadius: tokens.radius.cardMax,
    backgroundColor: tokens.color.darkSurface,
  },
  message: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.surface },
  action: {
    minWidth: 64,
    minHeight: tokens.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionText: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.darkAction },
});
