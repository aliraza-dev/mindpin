// The "Whose place is this?" field of the save sheet, as drawn in Figma frame "02 Save a shared
// location": a text field with a list of people under it (R3.1 to R3.4, R3.8). It only shows
// what it is given and reports what the user chose; nothing here reads the address book.
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Person } from '../../db/people';
import { initialsOf } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { TextField } from '../../ui/TextField';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import type { ContactsAccess } from './contacts';
import { suggestPeople, type PersonChoice } from './matchPerson';
import { PERSON_LIMITS } from './personForm';
import type { DeviceContact } from './types';

type Props = {
  // What is in the field, and the choice it stands for.
  text: string;
  choice: PersonChoice;
  // The people suggested before anything is typed (R3.3).
  recent: Person[];
  people: Person[];
  // Device contacts, already in memory; empty when access was not given.
  contacts: DeviceContact[];
  access: ContactsAccess;
  // Labels of the places each person already has, by person id.
  savedLabels: Record<string, string[]>;
  onChange: (text: string, choice: PersonChoice) => void;
  // The user agreed to the reason shown; the caller shows the system prompt (R3.1).
  onAllowContacts: () => void;
};

type Row = {
  key: string;
  name: string;
  photoUri: string | null;
  detail: string;
  choice: PersonChoice;
  selected: boolean;
};

const AVATAR = 32;

export function ContactPicker(props: Props) {
  const styles = useStyles();
  const { text, choice, recent, people, contacts, access, savedLabels } = props;
  const { t } = useTranslation();
  // The reason for contacts is shown only once the user starts using the field (R3.1).
  const [used, setUsed] = useState(false);

  const personRow = (person: Person): Row => {
    const labels = savedLabels[person.id] ?? [];
    const origin = t(person.contactRef ? 'people:picker.fromContacts' : 'people:picker.inMindPin');
    return {
      key: `p-${person.id}`,
      name: person.name,
      photoUri: person.photoUri,
      detail:
        labels.length > 0
          ? `${origin} · ${t('people:picker.alreadyHas', { labels: labels.join(', ') })}`
          : origin,
      choice: { kind: 'existing', personId: person.id },
      selected: choice.kind === 'existing' && choice.personId === person.id,
    };
  };

  const rows: Row[] = text.trim()
    ? suggestPeople(text, people, contacts).map((suggestion) =>
        suggestion.kind === 'person'
          ? personRow(suggestion.person)
          : {
              key: `c-${suggestion.contact.contactRef}`,
              name: suggestion.contact.name,
              photoUri: suggestion.contact.photoUri,
              detail: t('people:picker.fromContacts'),
              choice: { kind: 'contact', contact: suggestion.contact },
              selected:
                choice.kind === 'contact' &&
                choice.contact.contactRef === suggestion.contact.contactRef,
            },
      )
    : recent.map(personRow);

  const active = used || text.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      <TextField
        label={t('people:picker.label')}
        value={text}
        maxLength={PERSON_LIMITS.name}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="off"
        onFocus={() => setUsed(true)}
        onChangeText={(typed) => {
          const name = typed.replace(/\s+/g, ' ').trim();
          props.onChange(typed, name ? { kind: 'new', name } : { kind: 'none' });
        }}
      />

      {rows.length > 0 ? (
        <View style={styles.list}>
          {rows.map((row, index) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={t('people:picker.chooseA11y', { name: row.name })}
              accessibilityState={{ selected: row.selected }}
              onPress={() => props.onChange(row.name, row.choice)}
              style={[styles.row, index > 0 && styles.divider, row.selected && styles.rowOn]}
            >
              {row.photoUri ? (
                <Image
                  testID="contact-photo"
                  source={{ uri: row.photoUri }}
                  style={styles.avatar}
                  contentFit="cover"
                  accessible={false}
                />
              ) : (
                <View style={[styles.avatar, styles.initials, row.selected && styles.initialsOn]}>
                  <Text style={[styles.initialsText, row.selected && styles.initialsTextOn]}>
                    {initialsOf(row.name)}
                  </Text>
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {row.detail}
                </Text>
              </View>
              {row.selected ? <Icon name="pickCheck" /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {active && access === 'not_asked' ? (
        <View style={styles.ask}>
          <Text style={styles.reason}>{t('people:picker.reason')}</Text>
          <Button
            variant="secondary"
            label={t('people:picker.allow')}
            accessibilityLabel={t('people:picker.allowA11y')}
            onPress={props.onAllowContacts}
          />
        </View>
      ) : null}
      {active && access === 'denied' ? (
        <Text style={styles.reason}>{t('people:picker.denied')}</Text>
      ) : null}
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    wrapper: { gap: 9 },
    list: {
      borderRadius: tokens.radius.input,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    row: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingEnd: 16,
    },
    rowOn: { backgroundColor: colors.tealSoft },
    divider: { borderTopWidth: 1, borderTopColor: colors.divider },
    avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
    initials: { backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
    initialsOn: { backgroundColor: colors.tealTint },
    initialsText: { fontFamily: tokens.font.bodyBold, fontSize: 12, color: colors.secondaryText },
    initialsTextOn: { color: colors.tealText },
    rowText: { flex: 1, gap: 1 },
    name: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: colors.text },
    detail: { fontFamily: tokens.font.body, fontSize: 12, color: colors.secondaryText },
    ask: { gap: 9, alignItems: 'flex-start' },
    reason: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
  }),
);
