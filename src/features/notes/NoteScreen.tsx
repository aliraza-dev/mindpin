// Opens a note for writing and stores it as the user types (R10.1 to R10.3). A new note has
// no database row until the first keystroke, so opening the screen never waits for a write.
// The ids come from the screen address and have been checked by the route.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import {
  createNote,
  getMemory,
  removeDeletedNotes,
  softDeleteMemory,
  updateMemory,
  type Memory,
} from '../../db/memories';
import { getPerson, listPeople, type Person } from '../../db/people';
import { listPlaceSummaries, type PlaceSummary } from '../../db/placeSummaries';
import { logEvent } from '../../lib/log';
import { useDbQuery } from '../../lib/useDbQuery';
import { ScreenMessage } from '../../ui/ScreenMessage';
import { themed } from '../../ui/theme';
import { LinkPicker } from './LinkPicker';
import { NoteEditor } from './NoteEditor';
import { noteTitle } from './noteText';

type Props = {
  // Null for a new note.
  noteId: string | null;
  // False when the address named a note with a malformed id.
  validId: boolean;
  // For a new note started from a person's or a place's screen.
  personId: string | null;
  placeId: string | null;
};

type Loaded = {
  note: Memory | null;
  personId: string | null;
  placeId: string | null;
  people: Person[];
  places: PlaceSummary[];
};

export function NoteScreen({ noteId, validId, personId, placeId }: Props) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { state } = useDbQuery<Loaded | null>(
    async (db) => {
      const [people, places] = await Promise.all([listPeople(db), listPlaceSummaries(db)]);
      if (noteId) {
        const note = await getMemory(db, noteId);
        if (!note || note.type !== 'note' || note.deletedAt !== null) return null;
        return { note, personId: note.personId, placeId: note.placeId, people, places };
      }
      // A link that names a person or place that is gone is dropped, not stored.
      const person = personId ? await getPerson(db, personId) : null;
      const place = placeId ? places.find((entry) => entry.place.id === placeId) : undefined;
      return {
        note: null,
        personId: person?.id ?? null,
        placeId: place?.place.id ?? null,
        people,
        places,
      };
    },
    noteId ?? 'new',
    'note',
  );

  if (state.status === 'loading') return <View style={styles.blank} />;
  if (!validId || state.status === 'error' || !state.data) {
    return (
      <ScreenMessage
        message={t(state.status === 'error' ? 'notes:loadFailed' : 'notes:notFound')}
        backLabel={t('notes:back')}
        onBack={() => router.back()}
        topInset={insets.top}
      />
    );
  }

  return (
    <OpenNote
      loaded={state.data}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onClose={() => router.back()}
    />
  );
}

type OpenProps = { loaded: Loaded; topInset: number; bottomInset: number; onClose: () => void };

// Holds the note while it is open. It starts from the note as stored and is not reset when
// the screen's data loads again, so nothing typed is lost.
function OpenNote({ loaded, topInset, bottomInset, onClose }: OpenProps) {
  const { t } = useTranslation();
  const [links, setLinks] = useState({ personId: loaded.personId, placeId: loaded.placeId });
  const [picking, setPicking] = useState(false);

  const [initialBody] = useState(loaded.note?.notes ?? '');
  const [editedAt] = useState(() => loaded.note?.updatedAt ?? Date.now());
  const id = useRef(loaded.note?.id ?? null);
  const stored = useRef(initialBody);
  const latest = useRef(initialBody);
  const latestLinks = useRef(links);
  const warned = useRef(false);
  // Writes run one after another, so the row is created once and edits arrive in order.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const write = () => {
    queue.current = queue.current.then(async () => {
      const text = latest.current;
      try {
        const db = await getDatabase();
        if (id.current === null) {
          if (text.trim() === '') return;
          const note = await createNote(db, {
            title: noteTitle(text),
            notes: text,
            personId: latestLinks.current.personId,
            placeId: latestLinks.current.placeId,
          });
          id.current = note.id;
        } else if (text !== stored.current) {
          await updateMemory(db, id.current, { title: noteTitle(text), notes: text });
        }
        stored.current = text;
      } catch {
        logEvent('note_save_failed');
        if (!warned.current) {
          warned.current = true;
          Alert.alert(t('notes:editor.saveFailed'));
        }
      }
    });
    return queue.current;
  };

  const close = async () => {
    await write();
    // A note left empty is not kept.
    if (id.current !== null && latest.current.trim() === '') {
      try {
        const db = await getDatabase();
        await softDeleteMemory(db, id.current);
        await removeDeletedNotes(db, id.current);
      } catch {
        logEvent('note_delete_failed');
      }
    }
    onClose();
  };

  const saveLinks = async (next: { personId: string | null; placeId: string | null }) => {
    setPicking(false);
    setLinks(next);
    latestLinks.current = next;
    await queue.current;
    if (id.current === null) return;
    try {
      await updateMemory(await getDatabase(), id.current, next);
    } catch {
      logEvent('note_link_failed');
      Alert.alert(t('notes:link.failed'));
    }
  };

  return (
    <>
      <NoteEditor
        initialBody={initialBody}
        editedAt={editedAt}
        autoFocus={loaded.note === null}
        onChange={(body) => {
          latest.current = body;
          void write();
        }}
        onBack={close}
        onLink={() => setPicking(true)}
        topInset={topInset}
        bottomInset={bottomInset}
      />
      <LinkPicker
        visible={picking}
        people={loaded.people}
        places={loaded.places}
        personId={links.personId}
        placeId={links.placeId}
        onDone={saveLinks}
        onCancel={() => setPicking(false)}
        topInset={topInset}
        bottomInset={bottomInset}
      />
    </>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    blank: { flex: 1, backgroundColor: colors.background },
  }),
);
