// Loads the home screen's data from the on-device database and runs the search.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, Keyboard, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import type { Memory } from '../../db/memories';
import { deletePerson, listPeople, type Person } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { searchMemories, type SearchResult } from '../../db/search';
import { getSetting } from '../../db/settings';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import { useDbQuery } from '../../lib/useDbQuery';
import { AddMenu } from '../../ui/AddMenu';
import { useTabBarSpace } from '../navigation/tabBarSpace';
import { themed, useScheme } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { deletePlace } from '../places/editPlace';
import { chooseTheme, oppositeOf } from '../settings/themePreference';
import { findStalePlaces } from '../visits/stalePlaces';
import { greetingFor, summarizePeople } from './homeRows';
import { HomeView, type HomeListView } from './HomeView';

export function HomeScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const [view, setView] = useState<HomeListView>('people');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  // Counts searches so that only the answer to the latest keystroke is shown.
  const latestSearch = useRef(0);
  // Stops a double tap on Delete from running twice.
  const deleting = useRef(false);
  const scheme = useScheme();

  const { state, reload } = useDbQuery(
    async (db) => {
      const now = Date.now();
      const [firstName, people, places, stale] = await Promise.all([
        getSetting(db, 'user_first_name'),
        listPeople(db),
        listPlaceSummaries(db),
        findStalePlaces(db, now),
      ]);
      return { firstName, people: summarizePeople(people, places), places, stale, now };
    },
    'home',
    'home',
  );

  // While something is typed in the search, the phone's Back button empties it instead of
  // leaving the app (owner request, 2026-11-28).
  const searching = searchText !== '';
  useFocusEffect(
    useCallback(() => {
      if (!searching) return;
      const back = BackHandler.addEventListener('hardwareBackPress', () => {
        Keyboard.dismiss();
        latestSearch.current += 1;
        setSearchText('');
        setResults(null);
        return true;
      });
      return () => back.remove();
    }, [searching]),
  );

  const search = async (text: string) => {
    setSearchText(text);
    const ticket = ++latestSearch.current;
    if (!text.trim()) {
      setResults(null);
      return;
    }
    let found: SearchResult[] = [];
    try {
      found = await searchMemories(await getDatabase(), text);
    } catch {
      // Logged by event name only: what was typed is never logged.
      logEvent('search_failed');
    }
    if (ticket === latestSearch.current) setResults(found);
  };

  if (state.status === 'loading') return <View style={styles.blank} />;
  if (state.status === 'error') {
    return (
      <View style={[styles.blank, styles.center]}>
        <Text style={styles.message}>{t('home:loadFailed')}</Text>
      </View>
    );
  }

  const { firstName, people, places, stale, now } = state.data;

  // Deleting from a list always asks first (R3.13, R4.4). Only the Delete button of the
  // question deletes.
  const remove = async (work: (db: SqlDatabase) => Promise<unknown>, failedKey: string) => {
    if (deleting.current) return;
    deleting.current = true;
    try {
      await work(await getDatabase());
      reload();
      if (searchText.trim()) void search(searchText);
    } catch {
      logEvent('home_delete_failed');
      Alert.alert(t(failedKey));
    } finally {
      deleting.current = false;
    }
  };

  const confirmDeletePerson = (person: Person) => {
    Alert.alert(
      t('people:editForm.deleteTitle', { name: person.name }),
      t('people:editForm.deleteMessage'),
      [
        { text: t('people:editForm.deleteCancel'), style: 'cancel' },
        {
          text: t('people:editForm.deleteConfirm'),
          style: 'destructive',
          onPress: () =>
            remove((db) => deletePerson(db, person.id), 'people:editForm.deleteFailed'),
        },
      ],
    );
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

  return (
    <View style={styles.blank}>
      <HomeView
        greeting={greetingFor(new Date(now).getHours())}
        firstName={firstName}
        view={view}
        people={people}
        places={places}
        stale={stale}
        searchText={searchText}
        results={results}
        now={now}
        topInset={insets.top}
        bottomInset={barSpace}
        onSearchChange={search}
        onChangeView={setView}
        onOpenNotes={() => router.push('/notes')}
        scheme={scheme}
        onToggleTheme={() => void chooseTheme(oppositeOf(scheme))}
        onOpenProfile={() => router.push('/profile')}
        onEditPerson={(personId) => router.push(`/person/${personId}/edit`)}
        onDeletePerson={confirmDeletePerson}
        onEditPlace={(placeId) => router.push(`/place/${placeId}/edit`)}
        onDeletePlace={confirmDeletePlace}
        onOpenPerson={(personId) => router.push(`/person/${personId}`)}
        onOpenPlace={(placeId) => router.push(`/place/${placeId}`)}
        onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
      />
      <AddMenu
        bottomInset={barSpace}
        openLabel={t('home:add.openA11y')}
        closeLabel={t('home:add.closeA11y')}
        choices={[
          {
            key: 'note',
            label: t('home:add.note'),
            accessibilityLabel: t('home:add.noteA11y'),
            onPress: () => router.push({ pathname: '/note/[id]', params: { id: 'new' } }),
          },
          {
            key: 'place',
            label: t('home:add.place'),
            accessibilityLabel: t('home:add.placeA11y'),
            onPress: () => router.push('/place/new'),
          },
        ]}
      />
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    blank: { flex: 1, backgroundColor: colors.background },
    center: { justifyContent: 'center', padding: tokens.screenPadding },
    message: {
      fontFamily: tokens.font.body,
      fontSize: 16,
      color: colors.mutedText,
      textAlign: 'center',
    },
  }),
);
