// Loads the home screen's data from the on-device database and runs the search.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { listPeople } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { searchMemories, type SearchResult } from '../../db/search';
import { getSetting } from '../../db/settings';
import { logEvent } from '../../lib/log';
import { useDbQuery } from '../../lib/useDbQuery';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { findStalePlaces } from '../visits/stalePlaces';
import { greetingFor, summarizePeople } from './homeRows';
import { HomeView, type HomeListView } from './HomeView';

export function HomeScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<HomeListView>('people');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  // Counts searches so that only the answer to the latest keystroke is shown.
  const latestSearch = useRef(0);

  const { state } = useDbQuery(
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

  return (
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
      onSearchChange={search}
      onChangeView={setView}
      onOpenNotes={() => router.push('/notes')}
      onAddPlace={() => router.push('/place/new')}
      onOpenPerson={(personId) => router.push(`/person/${personId}`)}
      onOpenPlace={(placeId) => router.push(`/place/${placeId}`)}
      onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
    />
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
