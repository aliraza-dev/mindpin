// Loads a person from the on-device database and performs the screen's actions.
// The id comes from the screen address, so it has already been checked by the route.
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listNotesForPerson } from '../../db/memories';
import { getPerson } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { useDbQuery } from '../../lib/useDbQuery';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { tokens } from '../../ui/tokens';
import { callPerson, messagePerson } from '../links/externalLinks';
import { personPlacesShareText } from '../share/shareText';
import { PersonView } from './PersonView';

type Props = {
  // Null when the screen address did not carry a well-formed id.
  personId: string | null;
};

export function PersonScreen({ personId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { state } = useDbQuery(
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
      onNewNote={() => router.push({ pathname: '/note/[id]', params: { id: 'new', personId: person.id } })}
      onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: tokens.color.background },
});
