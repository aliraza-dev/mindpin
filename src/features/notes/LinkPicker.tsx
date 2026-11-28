// Chooses the person and the place a note is linked to (R10.8). The screen that opens it
// supplies the people and places and stores the choice.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Person } from '../../db/people';
import type { PlaceSummary } from '../../db/placeSummaries';
import { tokens, touchSlop } from '../../ui/tokens';
import type { NoteLinks } from './linkNote';

type Props = {
  visible: boolean;
  people: Person[];
  places: PlaceSummary[];
  personId: string | null;
  placeId: string | null;
  onDone: (links: Required<NoteLinks>) => void;
  onCancel: () => void;
  topInset?: number;
  bottomInset?: number;
};

export function LinkPicker(props: Props) {
  if (!props.visible) return null;
  // Mounted fresh each time it opens, so it always starts from the note's current links.
  return <OpenLinkPicker {...props} />;
}

function OpenLinkPicker(props: Props) {
  const { topInset = 0, bottomInset = 0 } = props;
  const { t } = useTranslation();
  const [personId, setPersonId] = useState(props.personId);
  const [placeId, setPlaceId] = useState(props.placeId);

  const row = (key: string, label: string, a11y: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.row, on && styles.rowOn]}
    >
      <Text style={[styles.rowText, on && styles.rowTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={props.onCancel}>
      <View style={[styles.screen, { paddingTop: topInset + 24, paddingBottom: bottomInset + 16 }]}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('notes:link.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notes:link.cancelA11y')}
            onPress={props.onCancel}
            hitSlop={touchSlop(18)}
          >
            <Text style={styles.cancel}>{t('notes:link.cancel')}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>{t('notes:link.person')}</Text>
          <View accessibilityRole="radiogroup" style={styles.list}>
            {row('none', t('notes:link.none'), t('notes:link.noPersonA11y'), personId === null, () =>
              setPersonId(null),
            )}
            {props.people.map((person) =>
              row(
                person.id,
                person.name,
                t('notes:link.personA11y', { name: person.name }),
                personId === person.id,
                () => setPersonId(person.id),
              ),
            )}
          </View>

          <Text style={[styles.label, styles.second]}>{t('notes:link.place')}</Text>
          <View accessibilityRole="radiogroup" style={styles.list}>
            {row('none', t('notes:link.none'), t('notes:link.noPlaceA11y'), placeId === null, () =>
              setPlaceId(null),
            )}
            {props.places.map(({ place, personName }) => {
              const label = personName ? `${place.title} · ${personName}` : place.title;
              return row(
                place.id,
                label,
                t('notes:link.placeA11y', { label }),
                placeId === place.id,
                () => setPlaceId(place.id),
              );
            })}
          </View>
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notes:link.doneA11y')}
          onPress={() => props.onDone({ personId, placeId })}
          style={styles.done}
        >
          <Text style={styles.doneText}>{t('notes:link.done')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.background,
    paddingHorizontal: tokens.screenPadding,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: tokens.font.headingBold, fontSize: 22, color: tokens.color.text },
  cancel: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.accent },
  content: { paddingTop: 23, paddingBottom: 24 },
  label: { fontFamily: tokens.font.bodyBold, fontSize: 13, color: tokens.color.text },
  second: { marginTop: 20 },
  list: {
    marginTop: 9,
    borderRadius: tokens.radius.cardMin,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  row: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  rowOn: { backgroundColor: tokens.color.tealSoft },
  rowText: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.text },
  rowTextOn: { fontFamily: tokens.font.bodyBold, color: tokens.color.tealText },
  done: {
    minHeight: tokens.size.mainButton,
    borderRadius: tokens.radius.actionButton,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontFamily: tokens.font.bodyBold, fontSize: 16, color: tokens.color.surface },
});
