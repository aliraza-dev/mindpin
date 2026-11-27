// Loads a place from the on-device database and performs the screen's actions.
// The id comes from the screen address, so it has already been checked by the route.
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { getMemory, listNotesForPlace } from '../../db/memories';
import { getPerson } from '../../db/people';
import { listVisits } from '../../db/visits';
import { useDbQuery } from '../../lib/useDbQuery';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { tokens } from '../../ui/tokens';
import { openInMaps } from '../links/externalLinks';
import { placeShareText } from '../share/shareText';
import { recordVisit } from '../visits/lastVisited';
import { rememberNavigate } from '../visits/navigateConfirm';
import { PlaceView } from './PlaceView';

type Props = {
  // Null when the screen address did not carry a well-formed id.
  placeId: string | null;
};

export function PlaceScreen({ placeId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Stops a double tap on "I'm here" from recording two visits.
  const savingVisit = useRef(false);

  const { state, reload } = useDbQuery(
    async (db) => {
      const place = placeId ? await getMemory(db, placeId) : null;
      if (!place || place.type !== 'place' || place.deletedAt !== null) return null;
      const [person, visits, linkedNotes] = await Promise.all([
        place.personId ? getPerson(db, place.personId) : null,
        listVisits(db, place.id),
        listNotesForPlace(db, place.id),
      ]);
      return { place, personName: person?.name ?? null, visits, linkedNotes, now: Date.now() };
    },
    placeId ?? '',
    'place',
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

  const { place, personName, visits, linkedNotes, now } = state.data;

  const navigate = async () => {
    if (!(await openInMaps(place))) {
      Alert.alert(t('places:cannotNavigate'));
      return;
    }
    // Remembered so the app can ask later whether the visit happened (R5.2).
    await rememberNavigate(await getDatabase(), place.id);
  };

  const imHere = async () => {
    if (savingVisit.current) return;
    savingVisit.current = true;
    try {
      await recordVisit(await getDatabase(), place.id, { source: 'manual' });
      reload();
    } catch {
      Alert.alert(t('places:visitFailed'));
    } finally {
      savingVisit.current = false;
    }
  };

  const share = async () => {
    const message = placeShareText(place);
    if (!message) {
      Alert.alert(t('places:nothingToShare'));
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // The share sheet was closed or is unavailable; there is nothing to recover.
    }
  };

  return (
    <PlaceView
      place={place}
      personName={personName}
      visits={visits}
      linkedNotes={linkedNotes}
      now={now}
      topInset={insets.top}
      onBack={() => router.back()}
      onNavigate={navigate}
      onImHere={imHere}
      onShare={share}
      onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: tokens.color.background },
});
