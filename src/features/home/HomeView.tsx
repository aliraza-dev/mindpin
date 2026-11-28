// The home screen, as drawn in Figma frame "01 Home", with the changes the owner approved:
// a plain search bar (no microphone) and no Ask MindPin. It only shows what it is given and
// reports taps; HomeScreen loads the data.
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Memory } from '../../db/memories';
import type { Person } from '../../db/people';
import type { PlaceSummary } from '../../db/placeSummaries';
import type { SearchResult } from '../../db/search';
import { Avatar, initialsOf } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { EmptyIllustration } from '../../ui/EmptyIllustration';
import { Icon } from '../../ui/Icon';
import { LogoMark } from '../../ui/LogoMark';
import { PlaceTile } from '../../ui/PlaceTile';
import { SwipeRow } from '../../ui/SwipeRow';
import { themed, useColors, type Scheme } from '../../ui/theme';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { tokens } from '../../ui/tokens';
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
  // The theme showing now, and the quick switch to the other one (R11.6).
  scheme: Scheme;
  onToggleTheme: () => void;
  // Reached by sliding a row aside. Deleting asks first; the screen does the asking.
  onEditPerson: (personId: string) => void;
  onDeletePerson: (person: Person) => void;
  onEditPlace: (placeId: string) => void;
  onDeletePlace: (place: Memory) => void;
  onOpenPerson: (personId: string) => void;
  onOpenPlace: (placeId: string) => void;
  onOpenNote: (noteId: string) => void;
};

const STALE_CARDS = 3;

export function HomeView(props: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { firstName, view, people, places, stale, results, now, topInset = 0 } = props;
  const { t } = useTranslation();
  const greeting = t(`home:greeting.${props.greeting}`);
  const nothingSaved = people.length === 0 && places.length === 0;
  // Each view has its own picture and message when it has nothing to list.
  const viewEmpty = view === 'people' ? people.length === 0 : places.length === 0;
  const emptyText = nothingSaved
    ? t('home:empty')
    : t(view === 'people' ? 'home:emptyPeople' : 'home:emptyPlaces');

  const placeRow = (place: Memory, personName: string | null, status: string | null) => (
    <SwipeRow
      key={place.id}
      actions={[
        {
          key: 'edit',
          icon: 'pencil',
          accessibilityLabel: t('home:swipe.editA11y', { name: place.title }),
          onPress: () => props.onEditPlace(place.id),
        },
        {
          key: 'delete',
          icon: 'trash',
          accessibilityLabel: t('home:swipe.deleteA11y', { name: place.title }),
          danger: true,
          onPress: () => props.onDeletePlace(place),
        },
      ]}
    >
      <Pressable
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
    </SwipeRow>
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
          <View style={styles.brand}>
            <LogoMark />
            <Text accessibilityRole="header" style={styles.appName}>
              {t('home:appName')}
            </Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <ThemeToggle
            scheme={props.scheme}
            onPress={props.onToggleTheme}
            accessibilityLabel={t(
              props.scheme === 'dark' ? 'home:theme.toLightA11y' : 'home:theme.toDarkA11y',
            )}
          />
          {firstName ? (
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.profile}
            >
              <Text style={styles.profileText}>{initialsOf(firstName).slice(0, 1)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.search}>
        <Icon name="search" />
        <TextInput
          accessibilityLabel={t('home:searchA11y')}
          placeholder={t('home:searchPlaceholder')}
          placeholderTextColor={colors.mutedText}
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
            <>
              <EmptyIllustration kind="search" />
              <Text style={styles.message}>
                {t('home:noResults', { text: props.searchText.trim() })}
              </Text>
            </>
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
            <Chip
              label={t('home:notes')}
              accessibilityLabel={t('home:notesA11y')}
              onPress={props.onOpenNotes}
            />
          </View>

          {viewEmpty ? (
            <>
              <EmptyIllustration kind={view === 'people' ? 'people' : 'places'} />
              <Text style={[styles.message, styles.centered]}>{emptyText}</Text>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.heading}>
                {t('home:recentlySaved')}
              </Text>
              {view === 'people'
                ? card(
                    people.map((row) => (
                      <SwipeRow
                        key={row.person.id}
                        actions={[
                          {
                            key: 'edit',
                            icon: 'pencil',
                            accessibilityLabel: t('home:swipe.editA11y', { name: row.person.name }),
                            onPress: () => props.onEditPerson(row.person.id),
                          },
                          {
                            key: 'delete',
                            icon: 'trash',
                            accessibilityLabel: t('home:swipe.deleteA11y', {
                              name: row.person.name,
                            }),
                            danger: true,
                            onPress: () => props.onDeletePerson(row.person),
                          },
                        ]}
                      >
                        <Pressable
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
                      </SwipeRow>
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

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding, paddingBottom: 104 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    greeting: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    brand: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    appName: {
      fontFamily: tokens.font.headingBold,
      fontSize: 28,
      color: colors.text,
    },
    profile: {
      width: tokens.size.avatar,
      height: tokens.size.avatar,
      borderRadius: tokens.size.avatar / 2,
      backgroundColor: colors.darkSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileText: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.onDark },
    search: {
      marginTop: 19,
      height: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      borderRadius: tokens.radius.field,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontFamily: tokens.font.body,
      fontSize: 15,
      color: colors.text,
    },
    chips: { marginTop: 17, flexDirection: 'row', gap: 9 },
    heading: {
      marginTop: 18,
      fontFamily: tokens.font.bodyBold,
      fontSize: 15,
      color: colors.text,
    },
    centered: { textAlign: 'center' },
    message: {
      marginTop: 18,
      fontFamily: tokens.font.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.mutedText,
    },
    card: {
      marginTop: 11,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    divider: { borderTopWidth: 1, borderTopColor: colors.divider },
    row: {
      minHeight: 73,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    rowDetail: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    rowStatus: { fontFamily: tokens.font.body, fontSize: 12, color: colors.secondaryText },
    badge: {
      minWidth: 61,
      height: 38,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.badge,
      backgroundColor: colors.tealSoft,
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: tokens.font.bodyBold,
      fontSize: 12,
      lineHeight: 15,
      color: colors.tealText,
    },
    staleCard: {
      marginTop: 18,
      minHeight: 69,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      paddingHorizontal: 19,
      borderRadius: tokens.radius.cardMax,
      backgroundColor: colors.darkSurface,
    },
    staleTitle: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: colors.onDark },
    staleDetail: { fontFamily: tokens.font.body, fontSize: 13, color: colors.darkMutedText },
    staleAction: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: colors.darkAction },
  }),
);
