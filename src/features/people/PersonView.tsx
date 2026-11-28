// The person screen, as drawn in Figma frame "03 Person". It only shows what it is given and
// reports taps; PersonScreen loads the data and performs the actions.
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Memory } from '../../db/memories';
import type { Person } from '../../db/people';
import { isSameDay, shortDate } from '../../lib/dates';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { PlaceTile } from '../../ui/PlaceTile';
import { SectionHeader } from '../../ui/SectionHeader';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { notePreview } from '../notes/noteText';
import { agoText, lastVisitedLabel } from '../visits/lastVisited';

export type PersonPlace = { place: Memory; lastVisitedAt: number | null };

type Props = {
  person: Person;
  places: PersonPlace[];
  notes: Memory[];
  now: number;
  // Space for the status bar, supplied by the screen.
  topInset?: number;
  onBack: () => void;
  // Opens the form that changes the name and phone number (R3.12).
  onEdit: () => void;
  onCall: () => void;
  onMessage: () => void;
  onSharePlaces: () => void;
  onAddPlace: () => void;
  onOpenPlace: (placeId: string) => void;
  onNewNote: () => void;
  onOpenNote: (noteId: string) => void;
};

export function PersonView(props: Props) {
  const styles = useStyles();
  const { person, places, notes, now, topInset = 0 } = props;
  const { t, i18n } = useTranslation();
  const firstName = person.name.trim().split(/\s+/)[0] ?? person.name;
  const subtitle = [person.phone, person.contactRef ? t('people:fromContacts') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}
    >
      <View style={styles.topRow}>
        <BackButton onPress={props.onBack} accessibilityLabel={t('people:back')} />
        <IconButton
          icon="edit"
          accessibilityLabel={t('people:editA11y', { name: person.name })}
          onPress={props.onEdit}
        />
      </View>

      <View style={styles.identity}>
        <Avatar name={person.name} tintKey={person.id} size="large" />
        <Text accessibilityRole="header" style={styles.name}>
          {person.name}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.actions}>
          {person.phone ? (
            <>
              <Button
                label={t('people:call')}
                accessibilityLabel={t('people:callA11y', { name: person.name })}
                onPress={props.onCall}
              />
              <Button
                variant="secondary"
                label={t('people:message')}
                accessibilityLabel={t('people:messageA11y', { name: person.name })}
                onPress={props.onMessage}
              />
            </>
          ) : null}
          <Button
            variant="secondary"
            label={t('people:sharePlaces')}
            accessibilityLabel={t('people:sharePlacesA11y', { name: person.name })}
            onPress={props.onSharePlaces}
          />
        </View>
      </View>

      <SectionHeader
        title={t('people:placesHeading', { count: places.length })}
        action={{
          label: t('people:addPlace'),
          accessibilityLabel: t('people:addPlaceA11y', { name: person.name }),
          onPress: props.onAddPlace,
        }}
      />
      <View style={styles.placeList}>
        {places.length === 0 ? (
          <Text style={styles.empty}>{t('people:noPlaces', { name: firstName })}</Text>
        ) : null}
        {places.map(({ place, lastVisitedAt }) => (
          <Pressable
            key={place.id}
            accessibilityRole="button"
            accessibilityLabel={t('people:openPlaceA11y', { label: place.title })}
            onPress={() => props.onOpenPlace(place.id)}
            style={styles.placeCard}
          >
            <PlaceTile label={place.title} />
            <View style={styles.placeText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {place.title}
              </Text>
              {place.address ? (
                <Text style={styles.rowDetail} numberOfLines={1}>
                  {place.address}
                </Text>
              ) : null}
              {lastVisitedAt === null ? (
                <Text style={styles.notVisited} numberOfLines={1}>
                  {t('people:notVisitedSaved', { when: agoText(place.createdAt, now) })}
                </Text>
              ) : (
                <Text style={styles.visited} numberOfLines={1}>
                  {lastVisitedLabel(lastVisitedAt, now)}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      <SectionHeader
        title={t('people:notesHeading', { name: firstName, count: notes.length })}
        action={{
          label: t('people:newNote'),
          accessibilityLabel: t('people:newNoteA11y', { name: person.name }),
          onPress: props.onNewNote,
        }}
      />
      {notes.length > 0 ? (
        <View style={styles.noteCard}>
          {notes.map((note, index) => {
            const title = note.title || t('people:untitledNote');
            const date = isSameDay(note.updatedAt, now)
              ? t('people:today')
              : shortDate(note.updatedAt, now, i18n.language);
            const preview = notePreview(note.notes ?? '');
            return (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                accessibilityLabel={t('people:openNoteA11y', { title })}
                onPress={() => props.onOpenNote(note.id)}
                style={[styles.noteRow, index > 0 && styles.noteDivider]}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.rowDetail} numberOfLines={1}>
                  {preview ? `${date} · ${preview}` : date}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding, paddingBottom: 32 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    identity: { alignItems: 'center', marginTop: 18, marginBottom: 25 },
    name: {
      marginTop: 8,
      fontFamily: tokens.font.headingBold,
      fontSize: 26,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontFamily: tokens.font.body,
      fontSize: 14,
      color: colors.mutedText,
      textAlign: 'center',
    },
    actions: {
      marginTop: 13,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    placeList: { marginTop: 18, marginBottom: 25, gap: 11 },
    placeCard: {
      minHeight: 79,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    placeText: { flex: 1, gap: 2 },
    rowTitle: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    rowDetail: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    notVisited: { fontFamily: tokens.font.bodyBold, fontSize: 12, color: colors.amberText },
    visited: { fontFamily: tokens.font.body, fontSize: 12, color: colors.secondaryText },
    empty: { fontFamily: tokens.font.body, fontSize: 14, color: colors.mutedText },
    noteCard: {
      marginTop: 18,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    noteRow: { minHeight: 62, justifyContent: 'center', paddingHorizontal: 14, gap: 3 },
    noteDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  }),
);
