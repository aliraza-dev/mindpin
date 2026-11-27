// Adding a place without a share (R4.7): paste a maps link or type an address, then the same
// save sheet opens. It has no Figma frame; it follows the edit forms (design.md).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormScreen } from '../../ui/FormScreen';
import { TextField } from '../../ui/TextField';
import { SaveSheet } from '../save/SaveSheet';

// A pasted link can be long; an address is short. Anything longer is not either.
const MAX_INPUT = 2000;

type Props = {
  // The person whose screen this was opened from, already checked by the route.
  personId: string | null;
};

export function AddPlaceScreen({ personId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const [entered, setEntered] = useState<string | null>(null);

  if (entered !== null) {
    return (
      <SaveSheet sharedText={entered} manual initialPersonId={personId} onClose={() => router.back()} />
    );
  }

  return (
    <FormScreen
      title={t('save:add.title')}
      cancelLabel={t('save:cancel')}
      cancelAccessibilityLabel={t('save:cancelA11y')}
      onCancel={() => router.back()}
      saveLabel={t('save:add.continue')}
      saveAccessibilityLabel={t('save:add.continueA11y')}
      onSave={() => {
        if (text.trim()) setEntered(text.trim());
        else setError(true);
      }}
      topInset={insets.top}
      bottomInset={insets.bottom}
    >
      <TextField
        label={t('save:add.field')}
        value={text}
        onChangeText={(next) => {
          setText(next);
          setError(false);
        }}
        maxLength={MAX_INPUT}
        multiline
        autoFocus
        autoCorrect={false}
        hint={t('save:add.hint')}
        error={error ? t('save:add.empty') : undefined}
      />
    </FormScreen>
  );
}
