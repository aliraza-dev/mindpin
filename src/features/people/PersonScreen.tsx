// Loads a person from the on-device database and performs the screen's actions.
// The id comes from the screen address, so it has already been checked by the route.
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import {
  listNotesForPerson,
  removeDeletedNotes,
  softDeleteMemory,
  type Memory,
} from '../../db/memories';
import { getPerson } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import { useDbQuery } from '../../lib/useDbQuery';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { themed } from '../../ui/theme';
import { callPerson, messagePerson } from '../links/externalLinks';
import { personPlacesShareText } from '../share/shareText';
import { deletePlace } from '../places/editPlace';
import { PersonView } from './PersonView';

type Props = {
  // Null when the screen address did not carry a well-formed id.
  personId: string | null;
};

export function PersonScreen({ personId }: Props) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Stops a double tap on Delete from deleting twice.
  const deleting = useRef(false);

  const { state, reload } = useDbQuery(
    async (db) => {
      const person = personId ? await getPerson(db, personId) : null;
      if (!person) return null;
      const [places, notes] = await Promise.all([
        listPlaceSummaries(db, person.id),
        listNotesForPerson(db, person.id),
      ]);
      return { person, places, notes, now: Date.now() };
    },
    personId ?? '',
    'person',
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

  const { person, places, notes, now } = state.data;

  // Deleting from a list always asks first (R4.4). Only the Delete button of the question
  // deletes.
  const remove = async (work: (db: SqlDatabase) => Promise<unknown>, failedKey: string) => {
    if (deleting.current) return;
    deleting.current = true;
    try {
      await work(await getDatabase());
      reload();
    } catch {
      // Logged by event name only: nothing about the place or note is logged.
      logEvent('person_list_delete_failed');
      Alert.alert(t(failedKey));
    } finally {
      deleting.current = false;
    }
  };

  const confirmDeletePlace = (place: Memory) => {
    Alert.alert(t('places:deleteTitle', { label: place.title }), t('places:deleteMessage'), [
      { text: t('places:deleteCancel'), style: 'cancel' },
      {
        text: t('places:deleteConfirm'),
        style: 'destructive',
        onPress: () => remove((db) => deletePlace(db, place.id), 'places:deleteFailed'),
      },
    ]);
  };

  const confirmDeleteNote = (note: Memory) => {
    const title = note.title || t('people:untitledNote');
    Alert.alert(t('people:deleteNote.title', { title }), t('people:deleteNote.message'), [
      { text: t('people:deleteNote.cancel'), style: 'cancel' },
      {
        text: t('people:deleteNote.confirm'),
        style: 'destructive',
        onPress: () =>
          remove(async (db) => {
            await softDeleteMemory(db, note.id);
            await removeDeletedNotes(db, note.id);
          }, 'people:deleteNote.failed'),
      },
    ]);
  };

  const sharePlaces = async () => {
    const message = personPlacesShareText(places.map((p) => p.place));
    if (!message) {
      Alert.alert(t('people:nothingToShare'));
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // The share sheet was closed or is unavailable; there is nothing to recover.
    }
  };

  return (
    <PersonView
      person={person}
      places={places}
      notes={notes}
      now={now}
      topInset={insets.top}
      onBack={() => router.back()}
      onEdit={() => router.push(`/person/${person.id}/edit`)}
      onCall={async () => {
        if (!(await callPerson(person.phone))) Alert.alert(t('people:cannotCall'));
      }}
      onMessage={async () => {
        if (!(await messagePerson(person.phone))) Alert.alert(t('people:cannotMessage'));
      }}
      onSharePlaces={sharePlaces}
      onAddPlace={() => router.push({ pathname: '/place/new', params: { personId: person.id } })}
      onOpenPlace={(placeId) => router.push(`/place/${placeId}`)}
      onNewNote={() =>
        router.push({ pathname: '/note/[id]', params: { id: 'new', personId: person.id } })
      }
      onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
      onEditPlace={(placeId) => router.push(`/place/${placeId}/edit`)}
      onDeletePlace={confirmDeletePlace}
      onDeleteNote={confirmDeleteNote}
    />
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    blank: { flex: 1, backgroundColor: colors.background },
  }),
);
