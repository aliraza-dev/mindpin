// The label chips of the save sheet and the edit form (R4.1): Home, Shop, Office, or a label
// of the user's own, as drawn in Figma frame "02 Save a shared location".
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../ui/Chip';
import { TextField } from '../../ui/TextField';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { PLACE_LIMITS, PRESET_LABELS, type LabelChoice, type PresetLabel } from './placeForm';

const PRESET_TEXT: Record<PresetLabel, string> = {
  Home: 'places:editForm.labelHome',
  Shop: 'places:editForm.labelShop',
  Office: 'places:editForm.labelOffice',
};

type Props = {
  choice: LabelChoice;
  customLabel: string;
  onChoice: (choice: LabelChoice) => void;
  onCustomLabel: (text: string) => void;
  // What is wrong with the label, already translated.
  error?: string;
};

// The label to store for what is chosen.
export function chosenLabel(choice: LabelChoice, customLabel: string): string {
  return choice === 'custom' ? customLabel : choice;
}

export function LabelPicker({ choice, customLabel, onChoice, onCustomLabel, error }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  // Only when the user has just chosen Custom does its field take the keyboard.
  const [focusCustom, setFocusCustom] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{t('places:editForm.label')}</Text>
      <View style={styles.chips}>
        {PRESET_LABELS.map((preset) => {
          const text = t(PRESET_TEXT[preset]);
          return (
            <Chip
              key={preset}
              label={text}
              accessibilityLabel={t('places:editForm.labelChipA11y', { label: text })}
              selected={choice === preset}
              onPress={() => onChoice(preset)}
            />
          );
        })}
        <Chip
          label={t('places:editForm.labelCustom')}
          accessibilityLabel={t('places:editForm.labelCustomA11y')}
          selected={choice === 'custom'}
          onPress={() => {
            onChoice('custom');
            setFocusCustom(true);
          }}
        />
      </View>
      {choice === 'custom' ? (
        <TextField
          label={t('places:editForm.customLabel')}
          value={customLabel}
          onChangeText={onCustomLabel}
          maxLength={PLACE_LIMITS.label}
          autoFocus={focusCustom}
          autoCapitalize="words"
          error={error}
        />
      ) : null}
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    group: { gap: 9 },
    groupLabel: { fontFamily: tokens.font.bodyBold, fontSize: 13, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  }),
);
