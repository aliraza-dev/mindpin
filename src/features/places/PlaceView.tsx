// The place screen, as drawn in Figma frame "04 Place details". It only shows what it is given
// and reports taps; PlaceScreen loads the data and performs the actions.
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Memory } from '../../db/memories';
import type { Visit } from '../../db/visits';
import { isSameDay, shortDate } from '../../lib/dates';
import { ActionButton } from '../../ui/ActionButton';
import { BackButton } from '../../ui/BackButton';
import { IconButton } from '../../ui/IconButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { tokens } from '../../ui/tokens';
import { PlaceMap } from '../map/PlaceMap';
import { notePreview } from '../notes/noteText';
import { agoText } from '../visits/lastVisited';

// A tag that carries a code, such as a gate code: three or more digits in a row. These stand
// out in the design because they are what you need at the door. The test is on digits, so it
// works in any language.
export function isCodeTag(tag: string): boolean {
  return /\d{3,}/.test(tag);
}

type Props = {
  place: Memory;
  personName: string | null;
  // Newest first.
  visits: Visit[];
  linkedNotes: Memory[];
  now: number;
  // Whether a map can be drawn right now: the build has a maps key and the phone is online.
  // A place with no pin never gets a map.
  showMap: boolean;
  // Space for the status bar, supplied by the screen.
  topInset?: number;
  onBack: () => void;
  // Opens the menu that holds Edit and Delete (R4.4).
  onOpenMenu: () => void;
  onNavigate: () => void;
  onImHere: () => void;
  onShare: () => void;
  onOpenNote: (noteId: string) => void;
};

// The map area is 300 px high in the design and the sheet overlaps its last 24 px.
const MAP_HEIGHT = 300;

export function PlaceView(props: Props) {
  const { place, personName, visits, linkedNotes, now, showMap, topInset = 0 } = props;
  const { t, i18n } = useTranslation();
  const date = (time: number) => shortDate(time, now, i18n.language);
  const hasNotes = place.tags.length > 0 || !!place.notes;

  const visitRows = [
    ...visits.map((visit) => ({
      key: visit.id,
      text: visit.note ? `${date(visit.visitedAt)} · ${visit.note}` : date(visit.visitedAt),
      time: visit.visitedAt,
    })),
    // The day the place was saved closes the list, as in the design.
    { key: 'saved', text: `${date(place.createdAt)} · ${t('places:firstSaved')}`, time: place.createdAt },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} bounces={false}>
      {/* Without a map (no maps key, offline, or no pin) the address below stands in for it. */}
      <View style={styles.map}>
        {showMap && place.lat !== null && place.lng !== null ? (
          <PlaceMap lat={place.lat} lng={place.lng} bottomInset={tokens.radius.sheet} />
        ) : null}
        <View style={[styles.topRow, { paddingTop: topInset + 8 }]}>
          <BackButton onPress={props.onBack} accessibilityLabel={t('places:back')} />
          <IconButton
            icon="more"
            accessibilityLabel={t('places:moreA11y', { label: place.title })}
            onPress={props.onOpenMenu}
          />
        </View>
      </View>

      <View style={styles.sheet}>
        {personName ? <Text style={styles.person}>{personName}</Text> : null}
        <Text accessibilityRole="header" style={styles.label}>
          {place.title}
        </Text>
        {place.address ? <Text style={styles.address}>{place.address}</Text> : null}

        <View style={styles.actions}>
          <ActionButton
            variant="primary"
            icon="navigate"
            label={t('places:navigate')}
            accessibilityLabel={t('places:navigateA11y', { label: place.title })}
            onPress={props.onNavigate}
          />
          <ActionButton
            icon="check"
            label={t('places:imHere')}
            accessibilityLabel={t('places:imHereA11y', { label: place.title })}
            onPress={props.onImHere}
          />
          <ActionButton
            icon="share"
            label={t('places:share')}
            accessibilityLabel={t('places:shareA11y', { label: place.title })}
            onPress={props.onShare}
          />
        </View>

        {hasNotes ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              {t('places:notes')}
            </Text>
            {place.tags.length > 0 ? (
              <View style={styles.tags}>
                {place.tags.map((tag, index) => {
                  const code = isCodeTag(tag);
                  return (
                    <View key={`${index}-${tag}`} style={[styles.tag, code && styles.codeTag]}>
                      <Text style={code ? styles.codeTagText : styles.tagText}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
            {place.notes ? <Text style={styles.notes}>{place.notes}</Text> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              {t('places:visits')}
            </Text>
            <Text style={styles.total}>{t('places:visitsTotal', { count: visits.length })}</Text>
          </View>
          {visitRows.map((row, index) => {
            const ago = agoText(row.time, now);
            return (
              <View
                key={row.key}
                testID="visit-row"
                accessible
                accessibilityLabel={`${row.text}, ${ago}`}
                style={styles.visitRow}
              >
                <View style={[styles.dot, index === 0 && visits.length > 0 && styles.dotOn]} />
                <Text style={styles.visitText} numberOfLines={1}>
                  {row.text}
                </Text>
                <Text style={styles.visitAgo}>{ago}</Text>
              </View>
            );
          })}
        </View>

        {linkedNotes.length > 0 ? (
          <>
            <View style={styles.linkedHeader}>
              <SectionHeader title={t('places:linkedNotes', { count: linkedNotes.length })} />
            </View>
            <View style={styles.noteCard}>
              {linkedNotes.map((note, index) => {
                const title = note.title || t('places:untitledNote');
                const when = isSameDay(note.updatedAt, now) ? t('places:today') : date(note.updatedAt);
                const preview = notePreview(note.notes ?? '');
                return (
                  <Pressable
                    key={note.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('places:openNoteA11y', { title })}
                    onPress={() => props.onOpenNote(note.id)}
                    style={[styles.noteRow, index > 0 && styles.noteDivider]}
                  >
                    <Text style={styles.noteTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.noteDetail} numberOfLines={1}>
                      {preview ? `${when} · ${preview}` : when}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.background },
  content: { flexGrow: 1 },
  map: { height: MAP_HEIGHT, backgroundColor: tokens.color.mapPlaceholder },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.screenPadding,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -tokens.radius.sheet,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    backgroundColor: tokens.color.background,
    paddingHorizontal: tokens.screenPadding,
    paddingTop: 21,
    paddingBottom: 32,
  },
  person: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.mutedText },
  label: {
    marginTop: 4,
    fontFamily: tokens.font.headingBold,
    fontSize: 26,
    color: tokens.color.text,
  },
  address: {
    marginTop: 4,
    fontFamily: tokens.font.body,
    fontSize: 14,
    color: tokens.color.secondaryText,
  },
  actions: { marginTop: 17, flexDirection: 'row', gap: 8 },
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: tokens.radius.cardMax,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.text },
  total: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.secondaryText },
  tags: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    height: tokens.size.tag,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.tag,
    backgroundColor: tokens.color.divider,
    justifyContent: 'center',
  },
  codeTag: { backgroundColor: tokens.color.amberTint },
  tagText: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.text },
  codeTagText: { fontFamily: tokens.font.bodyBold, fontSize: 13, color: tokens.color.amberTagText },
  notes: {
    marginTop: 9,
    fontFamily: tokens.font.body,
    fontSize: 14,
    lineHeight: 17,
    color: tokens.color.secondaryText,
  },
  visitRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.color.inactiveDot },
  dotOn: { backgroundColor: tokens.color.accent },
  visitText: { flex: 1, fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text },
  visitAgo: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.mutedText },
  linkedHeader: { marginTop: 25 },
  noteCard: {
    marginTop: 18,
    borderRadius: tokens.radius.cardMax,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  noteRow: { minHeight: 62, justifyContent: 'center', paddingHorizontal: 14, gap: 3 },
  noteDivider: { borderTopWidth: 1, borderTopColor: tokens.color.divider },
  noteTitle: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: tokens.color.text },
  noteDetail: { fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.mutedText },
});
