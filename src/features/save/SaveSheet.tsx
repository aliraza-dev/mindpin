// The save sheet, as drawn in Figma frame "02 Save a shared location" (R1.2 to R1.5, R2.3,
// R3.1 to R3.5, R3.11, R4.1, R4.2). It reads the shared text, shows what was found, and saves
// with one tap. Saving never waits for the network: what is still being looked up is finished
// afterwards. Nothing shown here is logged.
// The no-location choice, the duplicate offer, and the tags field have no frame of their own.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { listPeople, type Person } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { MAPS_AVAILABLE } from '../../lib/buildFlags';
import { logEvent } from '../../lib/log';
import { useOnline } from '../../lib/useOnline';
import { parseShared } from '../../parser/parseShared';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { TagsField } from '../../ui/TagsField';
import { TextField } from '../../ui/TextField';
import { themed } from '../../ui/theme';
import { tokens, touchSlop } from '../../ui/tokens';
import { PlaceMap } from '../map/PlaceMap';
import { ContactPicker } from '../people/ContactPicker';
import { deviceContacts, type ContactsAccess } from '../people/contacts';
import { recentPeople, type PersonChoice } from '../people/matchPerson';
import type { DeviceContact } from '../people/types';
import { findNearbyPlace, type NearbyPlace } from '../places/findNearby';
import { chosenLabel, LabelPicker } from '../places/LabelPicker';
import {
  PLACE_LIMITS,
  validatePlaceForm,
  type LabelChoice,
  type PlaceFormErrors,
} from '../places/placeForm';
import { deviceLookups } from './lookups';
import { previewShared, type Preview } from './preview';
import { saveAsNote } from './saveAsNote';
import { savePlace } from './savePlace';

// Shared text comes from other apps: only its start is ever kept (design.md, security rules).
const MAX_KEPT_TEXT = 10_000;

export type SaveSheetResult = 'saved' | 'saved_note' | 'cancelled';

type Props = {
  // What was shared, pasted, or typed.
  sharedText: string;
  // The app the share came from, when known.
  sourceApp?: string | null;
  // Set when the sheet is opened from a person's screen (R4.7).
  initialPersonId?: string | null;
  // True when the user typed or pasted the text inside MindPin: there is no other app behind
  // the sheet, and typed words are taken as the address without asking.
  manual?: boolean;
  onClose: (result: SaveSheetResult) => void;
};

type Loaded = { people: Person[]; recent: Person[]; savedLabels: Record<string, string[]> };

export function SaveSheet({
  sharedText,
  sourceApp = null,
  initialPersonId,
  manual,
  onClose,
}: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const kept = useMemo(() => sharedText.slice(0, MAX_KEPT_TEXT), [sharedText]);
  const parsed = useMemo(() => parseShared(kept), [kept]);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loaded, setLoaded] = useState<Loaded>({ people: [], recent: [], savedLabels: {} });
  const [access, setAccess] = useState<ContactsAccess>('denied');
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  // Words with no pin may not be an address at all, so a share of them asks first (R1.4).
  const [asking, setAsking] = useState(
    !manual && (parsed.kind === 'text' || parsed.kind === 'not_found'),
  );
  const [typedAddress, setTypedAddress] = useState<string | null>(null);
  const [personText, setPersonText] = useState('');
  const [choice, setChoice] = useState<PersonChoice>({ kind: 'none' });
  const [label, setLabel] = useState<LabelChoice>('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [errors, setErrors] = useState<PlaceFormErrors>({});
  // The answer to "has this person a place here already?", and the choice to update it, each
  // kept with the person and pin they were for, so a change of either drops them.
  const [nearbyFound, setNearbyFound] = useState<{
    key: string;
    nearby: NearbyPlace | null;
  } | null>(null);
  const [updateFor, setUpdateFor] = useState<string | null>(null);
  // Stops a double tap from saving twice.
  const busy = useRef(false);

  // What the network can add before Save is tapped. Save does not wait for it.
  useEffect(() => {
    let active = true;
    void previewShared(parsed, deviceLookups).then((found) => {
      if (!active) return;
      setPreview(found);
      if (found.location.kind === 'not_found') setAsking(true);
    });
    return () => {
      active = false;
    };
  }, [parsed]);

  // People already in MindPin, and the address book if the user has allowed it before.
  useEffect(() => {
    let active = true;
    (async () => {
      const db = await getDatabase();
      const [people, recent, summaries] = await Promise.all([
        listPeople(db),
        recentPeople(db),
        listPlaceSummaries(db),
      ]);
      const savedLabels: Record<string, string[]> = {};
      for (const { place } of summaries) {
        if (place.personId) (savedLabels[place.personId] ??= []).push(place.title);
      }
      if (!active) return;
      setLoaded({ people, recent, savedLabels });
      const opener = initialPersonId ? people.find((p) => p.id === initialPersonId) : undefined;
      if (opener) {
        setPersonText(opener.name);
        setChoice({ kind: 'existing', personId: opener.id });
      }
      const current = await deviceContacts.getAccess();
      const list =
        current === 'all' || current === 'limited' ? await deviceContacts.loadContacts() : [];
      if (!active) return;
      setAccess(current);
      setContacts(list);
    })().catch(() => logEvent('save_sheet_load_failed'));
    return () => {
      active = false;
    };
  }, [initialPersonId]);

  const location = preview?.location ?? parsed;
  const pin = location.kind === 'coordinates' ? location : null;
  const pinLat = pin?.lat ?? null;
  const pinLng = pin?.lng ?? null;
  const chosenPersonId =
    choice.kind === 'existing'
      ? choice.personId
      : choice.kind === 'contact'
        ? (loaded.people.find((p) => p.contactRef === choice.contact.contactRef)?.id ?? null)
        : null;

  const nearbyKey = `${chosenPersonId}|${pinLat}|${pinLng}`;

  // Has this person already got a place at this spot? (R3.5)
  useEffect(() => {
    let active = true;
    if (!chosenPersonId || pinLat === null || pinLng === null) return;
    getDatabase()
      .then((db) => findNearbyPlace(db, chosenPersonId, { lat: pinLat, lng: pinLng }))
      .then(
        (found) => {
          if (active) setNearbyFound({ key: nearbyKey, nearby: found });
        },
        () => logEvent('nearby_check_failed'),
      );
    return () => {
      active = false;
    };
  }, [chosenPersonId, pinLat, pinLng, nearbyKey]);
  const nearby = nearbyFound?.key === nearbyKey ? nearbyFound.nearby : null;
  const update = updateFor === nearbyKey;
  const setUpdate = (on: boolean) => setUpdateFor(on ? nearbyKey : null);

  const allowContacts = async () => {
    try {
      const granted = await deviceContacts.requestAccess();
      setAccess(granted);
      if (granted === 'all' || granted === 'limited')
        setContacts(await deviceContacts.loadContacts());
    } catch {
      setAccess('denied');
    }
  };

  const personName =
    choice.kind === 'new'
      ? choice.name
      : choice.kind === 'contact'
        ? choice.contact.name
        : choice.kind === 'existing'
          ? (loaded.people.find((p) => p.id === choice.personId)?.name ?? personText)
          : null;

  const foundAddress =
    location.kind === 'text'
      ? location.text.slice(0, PLACE_LIMITS.address)
      : (preview?.address ?? null);
  const errorText = (field: keyof PlaceFormErrors) =>
    errors[field] ? t(`places:editForm.errors.${errors[field]}`) : undefined;

  const save = async () => {
    if (busy.current) return;
    const checked = validatePlaceForm(
      {
        label: chosenLabel(label, customLabel),
        address: typedAddress ?? foundAddress ?? '',
        notes,
        tagsText,
      },
      {
        hasPin:
          typedAddress === null &&
          (location.kind === 'coordinates' || location.kind === 'needs_resolve'),
      },
    );
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    busy.current = true;
    try {
      const { value } = checked;
      await savePlace(
        await getDatabase(),
        {
          // A typed address replaces whatever the text was taken for.
          location: typedAddress === null ? location : { kind: 'not_found' },
          address: value.address,
          person: choice,
          label: value.title,
          notes: value.notes ?? undefined,
          tags: value.tags.length > 0 ? value.tags : undefined,
          sourceApp,
          sourceRaw: kept,
          updatePlaceId: update && nearby ? nearby.place.id : undefined,
        },
        deviceLookups,
      );
      onClose('saved');
    } catch {
      Alert.alert(t('save:saveFailed'));
    } finally {
      busy.current = false;
    }
  };

  const saveNote = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await saveAsNote(await getDatabase(), { text: kept, sourceApp });
      onClose('saved_note');
    } catch {
      Alert.alert(t('save:noteFailed'));
    } finally {
      busy.current = false;
    }
  };

  const statusLine = !preview
    ? t('save:finding')
    : location.kind === 'needs_resolve'
      ? t('save:linkLater')
      : foundAddress === null && pin
        ? t('save:addressLater')
        : null;
  const sourceLine = pin
    ? t(pin.snapshot ? 'save:source.snapshot' : `save:source.${pin.source}`)
    : location.kind === 'text'
      ? t('save:source.text')
      : null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, manual && styles.screenPlain]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {manual ? null : (
        <View style={[styles.shared, { paddingTop: insets.top + 44 }]}>
          <Text style={styles.sharedFrom}>
            {sourceApp ? t('save:sharedFrom', { app: sourceApp }) : t('save:sharedText')}
          </Text>
          {kept.trim() ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleText} numberOfLines={2}>
                {kept.trim()}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={[styles.sheet, manual && { paddingTop: insets.top }]}>
        <View style={styles.handle} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        >
          <View style={styles.titleRow}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('save:title')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('save:cancelA11y')}
              onPress={() => onClose('cancelled')}
              hitSlop={touchSlop(18)}
            >
              <Text style={styles.cancel}>{t('save:cancel')}</Text>
            </Pressable>
          </View>

          {asking ? (
            <View style={styles.fields}>
              <Text style={styles.message}>{t('save:noLocation')}</Text>
              <Button
                size="large"
                label={t('save:saveAsNote')}
                accessibilityLabel={t('save:saveAsNoteA11y')}
                onPress={saveNote}
              />
              <Button
                size="large"
                variant="secondary"
                label={t('save:enterAddress')}
                accessibilityLabel={t('save:enterAddressA11y')}
                onPress={() => {
                  setTypedAddress(
                    parsed.kind === 'text' ? parsed.text.slice(0, PLACE_LIMITS.address) : '',
                  );
                  setAsking(false);
                }}
              />
            </View>
          ) : (
            <>
              <View style={styles.fields}>
                {typedAddress !== null ? (
                  <TextField
                    label={t('places:editForm.address')}
                    value={typedAddress}
                    onChangeText={setTypedAddress}
                    maxLength={PLACE_LIMITS.address}
                    multiline
                    error={errorText('address')}
                  />
                ) : (
                  <View style={styles.card}>
                    <View style={styles.thumb}>
                      {pin && MAPS_AVAILABLE && online ? (
                        <PlaceMap lat={pin.lat} lng={pin.lng} bottomInset={0} />
                      ) : (
                        <View testID="map-drawing">
                          <Icon name="mapThumb" />
                        </View>
                      )}
                    </View>
                    <View style={styles.cardText}>
                      {foundAddress ? (
                        <Text style={styles.address} numberOfLines={2}>
                          {foundAddress}
                        </Text>
                      ) : null}
                      {statusLine ? <Text style={styles.status}>{statusLine}</Text> : null}
                      {sourceLine ? <Text style={styles.source}>{sourceLine}</Text> : null}
                    </View>
                  </View>
                )}

                <ContactPicker
                  text={personText}
                  choice={choice}
                  recent={loaded.recent}
                  people={loaded.people}
                  contacts={contacts}
                  access={access}
                  savedLabels={loaded.savedLabels}
                  onChange={(text, next) => {
                    setPersonText(text);
                    setChoice(next);
                  }}
                  onAllowContacts={allowContacts}
                />

                {nearby && personName ? (
                  <View style={styles.duplicate}>
                    <Text style={styles.message}>
                      {t('save:duplicate', {
                        name: personName,
                        label: nearby.place.title,
                        meters: Math.round(nearby.distanceMeters),
                      })}
                    </Text>
                    <View style={styles.choices}>
                      <Chip
                        label={t('save:update', { label: nearby.place.title })}
                        accessibilityLabel={t('save:updateA11y', { label: nearby.place.title })}
                        selected={update}
                        onPress={() => setUpdate(true)}
                      />
                      <Chip
                        label={t('save:saveAsNew')}
                        accessibilityLabel={t('save:saveAsNewA11y')}
                        selected={!update}
                        onPress={() => setUpdate(false)}
                      />
                    </View>
                  </View>
                ) : null}

                <LabelPicker
                  choice={label}
                  customLabel={customLabel}
                  onChoice={setLabel}
                  onCustomLabel={setCustomLabel}
                  error={errorText('label')}
                />
                <TextField
                  label={t('places:editForm.notes')}
                  value={notes}
                  onChangeText={setNotes}
                  maxLength={PLACE_LIMITS.notes}
                  multiline
                  error={errorText('notes')}
                />
                <TagsField
                  label={t('places:editForm.tags')}
                  value={tagsText}
                  onChangeText={setTagsText}
                  tagMaxLength={PLACE_LIMITS.tag}
                  removeLabel={(tag) => t('places:editForm.removeTagA11y', { tag })}
                  hint={t('places:editForm.tagsHint')}
                  error={errorText('tags')}
                />
              </View>
              <Button
                size="large"
                label={personName ? t('save:saveTo', { name: personName }) : t('save:save')}
                accessibilityLabel={
                  personName ? t('save:saveToA11y', { name: personName }) : t('save:saveA11y')
                }
                onPress={save}
              />
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.scrim },
    screenPlain: { backgroundColor: colors.background },
    shared: { paddingHorizontal: tokens.screenPadding, paddingBottom: 18, gap: 8 },
    sharedFrom: { fontFamily: tokens.font.body, fontSize: 12, color: colors.scrimText },
    bubble: {
      alignSelf: 'flex-start',
      maxWidth: 284,
      borderRadius: tokens.radius.input,
      backgroundColor: colors.bubble,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    bubbleText: { fontFamily: tokens.font.body, fontSize: 13, color: colors.bubbleText },
    sheet: {
      flex: 1,
      borderTopLeftRadius: tokens.radius.saveSheet,
      borderTopRightRadius: tokens.radius.saveSheet,
      backgroundColor: colors.background,
    },
    handle: {
      alignSelf: 'center',
      marginTop: 10,
      width: 40,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.inactiveDot,
    },
    content: { flexGrow: 1, paddingHorizontal: tokens.screenPadding, paddingTop: 20 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: tokens.font.headingBold, fontSize: 22, color: colors.text },
    cancel: { fontFamily: tokens.font.body, fontSize: 15, color: colors.accent },
    fields: { marginTop: 23, marginBottom: 16, gap: 16 },
    card: {
      minHeight: 93,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: tokens.radius.actionButton,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    thumb: {
      width: 88,
      height: 72,
      borderRadius: tokens.radius.thumb,
      backgroundColor: colors.mapPlaceholder,
      overflow: 'hidden',
    },
    cardText: { flex: 1, gap: 3 },
    address: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    status: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    source: { fontFamily: tokens.font.bodyBold, fontSize: 12, color: colors.tealText },
    message: { fontFamily: tokens.font.body, fontSize: 14, color: colors.secondaryText },
    duplicate: {
      gap: 9,
      padding: 12,
      borderRadius: tokens.radius.input,
      backgroundColor: colors.amberTint,
    },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  }),
);
