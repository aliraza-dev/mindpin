// The home screen, as drawn in Figma frame "01 Home", with the changes the owner approved:
// a plain search bar (no microphone) and no Ask MindPin. It only shows what it is given and
// reports taps; HomeScreen loads the data.
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Memory } from '../../db/memories';
import type { PlaceSummary } from '../../db/placeSummaries';
import type { SearchResult } from '../../db/search';
import { Avatar, initialsOf } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { PlaceTile } from '../../ui/PlaceTile';
import { tokens, touchSlop } from '../../ui/tokens';
import { notePreview } from '../notes/noteText';
import { agoText, lastVisitedLabel } from '../visits/lastVisited';
import type { StalePlace } from '../visits/stalePlaces';
import { personRowSubtitle, type Greeting, type PersonRow } from './homeRows';

export type HomeListView = 'people' | 'places';

type Props = {
  greeting: Greeting;
  firstName: string | null;
  view: HomeListView;
  people: PersonRow[];
  places: PlaceSummary[];
  stale: StalePlace[];
  searchText: string;
  // Null while the user is not searching.
  results: SearchResult[] | null;
  now: number;
  // Space for the status bar, supplied by the screen.
  topInset?: number;
  onSearchChange: (text: string) => void;
  onChangeView: (view: HomeListView) => void;
  onOpenNotes: () => void;
  // Adding a place without a share (R4.7).
  onAddPlace: () => void;
  onOpenPerson: (personId: string) => void;
  onOpenPlace: (placeId: string) => void;
  onOpenNote: (noteId: string) => void;
};

const STALE_CARDS = 3;

export function HomeView(props: Props) {
  const { firstName, view, people, places, stale, results, now, topInset = 0 } = props;
  const { t } = useTranslation();
  const greeting = t(`home:greeting.${props.greeting}`);
  const nothingSaved = people.length === 0 && places.length === 0;

  const placeRow = (place: Memory, personName: string | null, status: string | null) => (
    <Pressable
      key={place.id}
      accessibilityRole="button"
      accessibilityLabel={t('home:openPlaceA11y', { label: place.title })}
      onPress={() => props.onOpenPlace(place.id)}
      style={styles.row}
    >
      <PlaceTile label={place.title} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {place.title}
        </Text>
        {personName || place.address ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {[personName, place.address].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {status ? (
          <Text style={styles.rowStatus} numberOfLines={1}>
            {status}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  const noteRow = (note: Memory) => {
    const title = note.title || t('home:untitledNote');
    const preview = notePreview(note.notes ?? '');
    return (
      <Pressable
        key={note.id}
        accessibilityRole="button"
        accessibilityLabel={t('home:openNoteA11y', { title })}
        onPress={() => props.onOpenNote(note.id)}
        style={styles.row}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {preview ? (
            <Text style={styles.rowDetail} numberOfLines={1}>
              {preview}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  // Rows sit in one card, separated by hairlines.
  const card = (rows: React.ReactNode[]) => (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View key={index} style={index > 0 && styles.divider}>
          {row}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topInset + 11 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.top}>
        <View>
          <Text style={styles.greeting}>
            {firstName ? t('home:greetingWithName', { greeting, name: firstName }) : greeting}
          </Text>
          <Text accessibilityRole="header" style={styles.appName}>
            {t('home:appName')}
          </Text>
        </View>
        {firstName ? (
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.profile}>
            <Text style={styles.profileText}>{initialsOf(firstName).slice(0, 1)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.search}>
        <Icon name="search" />
        <TextInput
          accessibilityLabel={t('home:searchA11y')}
          placeholder={t('home:searchPlaceholder')}
          placeholderTextColor={tokens.color.mutedText}
          value={props.searchText}
          onChangeText={props.onSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxLength={100}
          style={styles.searchInput}
        />
      </View>

      {results ? (
        <>
          <Text accessibilityRole="header" style={styles.heading}>
            {t('home:results')}
          </Text>
          {results.length === 0 ? (
            <Text style={styles.message}>{t('home:noResults', { text: props.searchText.trim() })}</Text>
          ) : (
            card(
              results.map(({ memory, personName }) =>
                memory.type === 'note' ? noteRow(memory) : placeRow(memory, personName, null),
              ),
            )
          )}
        </>
      ) : (
        <>
          <View style={styles.chips}>
            <Chip
              label={t('home:people')}
              accessibilityLabel={t('home:peopleA11y')}
              selected={view === 'people'}
              onPress={() => props.onChangeView('people')}
            />
            <Chip
              label={t('home:places')}
              accessibilityLabel={t('home:placesA11y')}
              selected={view === 'places'}
              onPress={() => props.onChangeView('places')}
            />
            <Chip label={t('home:notes')} accessibilityLabel={t('home:notesA11y')} onPress={props.onOpenNotes} />
          </View>

          {nothingSaved ? (
            <>
              <Text style={styles.message}>{t('home:empty')}</Text>
              <View style={styles.emptyAction}>
                <Button
                  label={t('home:addPlace')}
                  accessibilityLabel={t('home:addPlaceA11y')}
                  onPress={props.onAddPlace}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.headingRow}>
                <Text accessibilityRole="header" style={styles.headingText}>
                  {t('home:recentlySaved')}
                </Text>
                {view === 'places' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home:addPlaceA11y')}
                    onPress={props.onAddPlace}
                    hitSlop={touchSlop(18)}
                  >
                    <Text style={styles.link}>{t('home:addPlace')}</Text>
                  </Pressable>
                ) : null}
              </View>
              {view === 'people'
                ? card(
                    people.map((row) => (
                      <Pressable
                        key={row.person.id}
                        accessibilityRole="button"
                        accessibilityLabel={t('home:openPersonA11y', { name: row.person.name })}
                        onPress={() => props.onOpenPerson(row.person.id)}
                        style={styles.row}
                      >
                        <Avatar name={row.person.name} tintKey={row.person.id} />
                        <View style={styles.rowText}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {row.person.name}
                          </Text>
                          <Text style={styles.rowDetail} numberOfLines={2}>
                            {personRowSubtitle(row, now)}
                          </Text>
                        </View>
                        {row.placeLabels.length > 1 ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {t('home:placesBadge', { count: row.placeLabels.length })}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    )),
                  )
                : card(
                    places.map(({ place, personName, lastVisitedAt }) =>
                      placeRow(place, personName, lastVisitedLabel(lastVisitedAt, now)),
                    ),
                  )}
            </>
          )}

          {stale.slice(0, STALE_CARDS).map(({ place, personName, lastVisitedAt }) => {
            const title = personName ? `${personName} · ${place.title}` : place.title;
            return (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                accessibilityLabel={t('home:planVisitA11y', { label: title })}
                onPress={() => props.onOpenPlace(place.id)}
                style={styles.staleCard}
              >
                <Icon name="clock" />
                <View style={styles.rowText}>
                  <Text style={styles.staleTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.staleDetail} numberOfLines={1}>
                    {lastVisitedAt === null
                      ? t('home:neverVisited', { when: agoText(place.createdAt, now) })
                      : lastVisitedLabel(lastVisitedAt, now)}
                  </Text>
                </View>
                <Text style={styles.staleAction}>{t('home:planVisit')}</Text>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.background },
  content: { paddingHorizontal: tokens.screenPadding, paddingBottom: 32 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.mutedText },
  appName: {
    marginTop: 2,
    fontFamily: tokens.font.headingBold,
    fontSize: 28,
    color: tokens.color.text,
  },
  profile: {
    width: tokens.size.avatar,
    height: tokens.size.avatar,
    borderRadius: tokens.size.avatar / 2,
    backgroundColor: tokens.color.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: tokens.color.surface },
  search: {
    marginTop: 19,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.field,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
    backgroundColor: tokens.color.surface,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: tokens.font.body,
    fontSize: 15,
    color: tokens.color.text,
  },
  chips: { marginTop: 17, flexDirection: 'row', gap: 9 },
  heading: {
    marginTop: 18,
    fontFamily: tokens.font.bodyBold,
    fontSize: 15,
    color: tokens.color.text,
  },
  headingRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingText: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: tokens.color.text },
  link: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.accent },
  emptyAction: { marginTop: 16, alignItems: 'flex-start' },
  message: {
    marginTop: 18,
    fontFamily: tokens.font.body,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.color.mutedText,
  },
  card: {
    marginTop: 11,
    borderRadius: tokens.radius.cardMax,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: tokens.color.divider },
  row: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: tokens.color.text },
  rowDetail: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.mutedText },
  rowStatus: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.secondaryText },
  badge: {
    minWidth: 61,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.badge,
    backgroundColor: tokens.color.tealSoft,
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: tokens.font.bodyBold,
    fontSize: 12,
    lineHeight: 15,
    color: tokens.color.tealText,
  },
  staleCard: {
    marginTop: 18,
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 19,
    borderRadius: tokens.radius.cardMax,
    backgroundColor: tokens.color.darkSurface,
  },
  staleTitle: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.surface },
  staleDetail: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.darkMutedText },
  staleAction: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.darkAction },
});
