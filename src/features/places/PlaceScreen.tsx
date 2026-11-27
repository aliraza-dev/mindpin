// Loads a place from the on-device database and performs the screen's actions.
// The id comes from the screen address, so it has already been checked by the route.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { getMemory, listNotesForPlace } from '../../db/memories';
import { getPerson } from '../../db/people';
import { listVisits } from '../../db/visits';
import { MAPS_AVAILABLE } from '../../lib/buildFlags';
import { useDbQuery } from '../../lib/useDbQuery';
import { useOnline } from '../../lib/useOnline';
import { Menu } from '../../ui/Menu';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { tokens } from '../../ui/tokens';
import { openInMaps } from '../links/externalLinks';
import { placeShareText } from '../share/shareText';
import { recordVisit } from '../visits/lastVisited';
import { rememberNavigate } from '../visits/navigateConfirm';
import { deletePlace } from './editPlace';
import { PlaceView } from './PlaceView';

type Props = {
  // Null when the screen address did not carry a well-formed id.
  placeId: string | null;
};

export function PlaceScreen({ placeId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const [menuOpen, setMenuOpen] = useState(false);
  // Stops a double tap on "I'm here" from recording two visits.
  const savingVisit = useRef(false);
  const deleting = useRef(false);

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

  const remove = async () => {
    if (deleting.current) return;
    deleting.current = true;
    try {
      await deletePlace(await getDatabase(), place.id);
      router.back();
    } catch {
      Alert.alert(t('places:deleteFailed'));
    } finally {
      deleting.current = false;
    }
  };

  // Deleting always asks first (R4.4). Only the Delete button of this question deletes.
  const confirmDelete = () => {
    Alert.alert(t('places:deleteTitle', { label: place.title }), t('places:deleteMessage'), [
      { text: t('places:deleteCancel'), style: 'cancel' },
      { text: t('places:deleteConfirm'), style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <>
      <PlaceView
        place={place}
        personName={personName}
        visits={visits}
        linkedNotes={linkedNotes}
        now={now}
        showMap={MAPS_AVAILABLE && online}
        topInset={insets.top}
        onBack={() => router.back()}
        onOpenMenu={() => setMenuOpen(true)}
        onNavigate={navigate}
        onImHere={imHere}
        onShare={share}
        onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
      />
      <Menu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        closeLabel={t('places:closeMenuA11y')}
        // Just under the button that opens it.
        top={insets.top + 8 + tokens.size.iconButton + 6}
        items={[
          {
            key: 'edit',
            label: t('places:edit'),
            onPress: () => router.push(`/place/${place.id}/edit`),
          },
          { key: 'delete', label: t('places:delete'), onPress: confirmDelete },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: tokens.color.background },
});
