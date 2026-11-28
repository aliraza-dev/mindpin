// The form that edits a person (R3.12): the name and phone number kept in MindPin. The person
// can also be deleted from here (R3.13).
// It has no Figma frame; the fields follow the Save sheet frame (design.md).
// The id comes from the screen address, so it has already been checked by the route.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { deletePerson, getPerson, type Person } from '../../db/people';
import { useDbQuery } from '../../lib/useDbQuery';
import { Button } from '../../ui/Button';
import { FormScreen } from '../../ui/FormScreen';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { TextField } from '../../ui/TextField';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { PERSON_LIMITS, saveEditedPerson, type PersonFormErrors } from './personForm';

type Props = {
  // Null when the screen address did not carry a well-formed id.
  personId: string | null;
};

export function EditPersonScreen({ personId }: Props) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { state } = useDbQuery(
    async (db) => (personId ? getPerson(db, personId) : null),
    personId ?? '',
    'edit_person',
  );

  if (state.status === 'loading') return <View style={styles.blank} />;
  if (state.status === 'error' || !state.data) {
    return (
      <ScreenMessage
        message={t(state.status === 'error' ? 'people:loadFailed' : 'people:notFound')}
        backLabel={t('people:back')}
        onBack={() => router.back()}
        topInset={insets.top}
      />
    );
  }

  return (
    <EditPersonForm
      person={state.data}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onDone={() => router.back()}
      // The person's own screen is behind this form and has nothing left to show, so both
      // are left for Home.
      onDeleted={() => router.dismissTo('/')}
    />
  );
}

type FormProps = {
  person: Person;
  topInset: number;
  bottomInset: number;
  onDone: () => void;
  onDeleted: () => void;
};

// Holds what is being typed. It starts from the person as saved and is not reset when the
// screen's data loads again, so nothing typed is lost.
function EditPersonForm({ person, topInset, bottomInset, onDone, onDeleted }: FormProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone ?? '');
  const [errors, setErrors] = useState<PersonFormErrors>({});
  // Stops a double tap on Save or Delete from writing twice.
  const busy = useRef(false);

  const errorText = (field: keyof PersonFormErrors) =>
    errors[field] ? t(`people:editForm.errors.${errors[field]}`) : undefined;

  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await saveEditedPerson(await getDatabase(), person.id, { name, phone });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onDone();
    } catch {
      Alert.alert(t('people:editForm.saveFailed'));
    } finally {
      busy.current = false;
    }
  };

  const remove = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await deletePerson(await getDatabase(), person.id);
      onDeleted();
    } catch {
      Alert.alert(t('people:editForm.deleteFailed'));
    } finally {
      busy.current = false;
    }
  };

  // Deleting always asks first (R3.13). Only the Delete button of this question deletes.
  const confirmDelete = () => {
    Alert.alert(
      t('people:editForm.deleteTitle', { name: person.name }),
      t('people:editForm.deleteMessage'),
      [
        { text: t('people:editForm.deleteCancel'), style: 'cancel' },
        { text: t('people:editForm.deleteConfirm'), style: 'destructive', onPress: remove },
      ],
    );
  };

  return (
    <FormScreen
      title={t('people:editForm.title')}
      cancelLabel={t('people:editForm.cancel')}
      cancelAccessibilityLabel={t('people:editForm.cancelA11y')}
      onCancel={onDone}
      saveLabel={t('people:editForm.save')}
      saveAccessibilityLabel={t('people:editForm.saveA11y')}
      onSave={save}
      topInset={topInset}
      bottomInset={bottomInset}
      footer={
        <Button
          variant="secondary"
          size="large"
          label={t('people:editForm.delete')}
          accessibilityLabel={t('people:editForm.deleteA11y', { name: person.name })}
          onPress={confirmDelete}
        />
      }
    >
      <TextField
        label={t('people:editForm.name')}
        value={name}
        onChangeText={setName}
        maxLength={PERSON_LIMITS.name}
        autoCapitalize="words"
        autoComplete="off"
        error={errorText('name')}
      />
      <TextField
        label={t('people:editForm.phone')}
        value={phone}
        onChangeText={setPhone}
        maxLength={PERSON_LIMITS.phone}
        keyboardType="phone-pad"
        autoComplete="off"
        error={errorText('phone')}
      />
      {person.contactRef ? (
        <Text style={styles.note}>{t('people:editForm.contactsNote')}</Text>
      ) : null}
    </FormScreen>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    blank: { flex: 1, backgroundColor: colors.background },
    note: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
  }),
);
