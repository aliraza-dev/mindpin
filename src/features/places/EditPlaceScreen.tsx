// The form that edits a saved place (R4.4, R4.10): its label, address, notes, and tags.
// It has no Figma frame; the fields follow the Save sheet frame (design.md).
// The id comes from the screen address, so it has already been checked by the route.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { getMemory, type Memory } from '../../db/memories';
import { useDbQuery } from '../../lib/useDbQuery';
import { FormScreen } from '../../ui/FormScreen';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { joinTags, TagsField } from '../../ui/TagsField';
import { TextField } from '../../ui/TextField';
import { themed } from '../../ui/theme';
import { deviceLookups } from '../save/lookups';
import { saveEditedPlace } from './editPlace';
import { chosenLabel, LabelPicker } from './LabelPicker';
import { PLACE_LIMITS, labelChoice, type LabelChoice, type PlaceFormErrors } from './placeForm';

type Props = {
  // Null when the screen address did not carry a well-formed id.
  placeId: string | null;
};

export function EditPlaceScreen({ placeId }: Props) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { state } = useDbQuery(
    async (db) => {
      const place = placeId ? await getMemory(db, placeId) : null;
      return place && place.type === 'place' && place.deletedAt === null ? place : null;
    },
    placeId ?? '',
    'edit_place',
  );

  if (state.status === 'loading') return <View style={styles.blank} />;
  if (state.status === 'error' || !state.data) {
    return (
      <ScreenMessage
        message={t(state.status === 'error' ? 'places:loadFailed' : 'places:notFound')}
        backLabel={t('places:back')}
        onBack={() => router.back()}
        topInset={insets.top}
      />
    );
  }

  return (
    <EditPlaceForm
      place={state.data}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onDone={() => router.back()}
    />
  );
}

type FormProps = { place: Memory; topInset: number; bottomInset: number; onDone: () => void };

// Holds what is being typed. It starts from the place as saved and is not reset when the
// screen's data loads again, so nothing typed is lost.
function EditPlaceForm({ place, topInset, bottomInset, onDone }: FormProps) {
  const { t } = useTranslation();
  const savedChoice = labelChoice(place.title);
  const [choice, setChoice] = useState<LabelChoice>(savedChoice);
  const [customLabel, setCustomLabel] = useState(savedChoice === 'custom' ? place.title : '');
  const [address, setAddress] = useState(place.address ?? '');
  const [notes, setNotes] = useState(place.notes ?? '');
  // The saved tags open as pills, with nothing being typed after them.
  const [tagsText, setTagsText] = useState(() => joinTags(place.tags));
  const [errors, setErrors] = useState<PlaceFormErrors>({});
  // Stops a double tap on Save from writing twice.
  const saving = useRef(false);

  const errorText = (field: keyof PlaceFormErrors) =>
    errors[field] ? t(`places:editForm.errors.${errors[field]}`) : undefined;

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const result = await saveEditedPlace(
        await getDatabase(),
        place.id,
        { label: chosenLabel(choice, customLabel), address, notes, tagsText },
        deviceLookups,
      );
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onDone();
    } catch {
      Alert.alert(t('places:editForm.saveFailed'));
    } finally {
      saving.current = false;
    }
  };

  return (
    <FormScreen
      title={t('places:editForm.title')}
      cancelLabel={t('places:editForm.cancel')}
      cancelAccessibilityLabel={t('places:editForm.cancelA11y')}
      onCancel={onDone}
      saveLabel={t('places:editForm.save')}
      saveAccessibilityLabel={t('places:editForm.saveA11y')}
      onSave={save}
      topInset={topInset}
      bottomInset={bottomInset}
    >
      <LabelPicker
        choice={choice}
        customLabel={customLabel}
        onChoice={setChoice}
        onCustomLabel={setCustomLabel}
        error={errorText('label')}
      />

      <TextField
        label={t('places:editForm.address')}
        value={address}
        onChangeText={setAddress}
        maxLength={PLACE_LIMITS.address}
        multiline
        error={errorText('address')}
      />
      <TextField
        label={t('places:editForm.notes')}
        value={notes}
        onChangeText={setNotes}
        maxLength={PLACE_LIMITS.notes}
        multiline
        error={errorText('notes')}
      />
      <TagsField
        label={t('places:editForm.tags')}
        value={tagsText}
        onChangeText={setTagsText}
        tagMaxLength={PLACE_LIMITS.tag}
        removeLabel={(tag) => t('places:editForm.removeTagA11y', { tag })}
        hint={t('places:editForm.tagsHint')}
        error={errorText('tags')}
      />
    </FormScreen>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    blank: { flex: 1, backgroundColor: colors.background },
  }),
);
