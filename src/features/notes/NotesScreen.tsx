// Loads the notes and carries out what the list reports: pin, link, and delete with Undo
// (R10.6, R10.8, R10.10, R10.11).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../db/database';
import { listNotes, updateMemory, type Memory } from '../../db/memories';
import { listPeople } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { logEvent } from '../../lib/log';
import { useDbQuery } from '../../lib/useDbQuery';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { deleteNoteWithUndo, type PendingNoteDeletion } from './deleteNote';
import { LinkPicker } from './LinkPicker';
import { linkNote } from './linkNote';
import { NotesList, type NoteAction } from './NotesList';
import { UndoDeleteBar } from './UndoDeleteBar';

export function NotesScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [linking, setLinking] = useState<Memory | null>(null);
  const [undoShown, setUndoShown] = useState(false);
  const pending = useRef<PendingNoteDeletion | null>(null);

  const { state, reload } = useDbQuery(
    async (db) => {
      const [notes, people, places] = await Promise.all([
        listNotes(db),
        listPeople(db),
        listPlaceSummaries(db),
      ]);
      return { notes, people, places, now: Date.now() };
    },
    'notes',
    'notes',
  );

  // Leaving the screen ends the chance to undo (R10.10).
  useFocusEffect(
    useCallback(
      () => () => {
        void pending.current?.finish();
        pending.current = null;
        setUndoShown(false);
      },
      [],
    ),
  );

  if (state.status === 'loading') return <View style={styles.blank} />;
  if (state.status === 'error') {
    return (
      <View style={[styles.blank, styles.center]}>
        <Text style={styles.message}>{t('notes:loadFailed')}</Text>
      </View>
    );
  }

  const failed = (event: string) => {
    logEvent(event);
    Alert.alert(t('notes:actions.failed'));
  };

  const remove = async (note: Memory) => {
    try {
      // Only one note can be waiting for Undo; an earlier one is finished first.
      await pending.current?.finish();
      const deletion = await deleteNoteWithUndo(await getDatabase(), note.id);
      pending.current = deletion;
      setUndoShown(true);
      reload();
      void deletion.done.then(() => {
        if (pending.current !== deletion) return;
        pending.current = null;
        setUndoShown(false);
      });
    } catch {
      failed('note_delete_failed');
    }
  };

  const undo = async () => {
    try {
      await pending.current?.undo();
    } catch {
      failed('note_undo_failed');
    }
    reload();
  };

  const act = async (action: NoteAction, note: Memory) => {
    if (action === 'delete') return remove(note);
    if (action === 'link') return setLinking(note);
    try {
      await updateMemory(await getDatabase(), note.id, { pinned: !note.pinned });
      reload();
    } catch {
      failed('note_pin_failed');
    }
  };

  const { notes, people, places, now } = state.data;

  return (
    <View style={styles.blank}>
      <NotesList
        notes={notes}
        now={now}
        onOpen={(noteId) => router.push({ pathname: '/note/[id]', params: { id: noteId } })}
        onNew={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })}
        onBack={() => router.back()}
        onAction={act}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
      {undoShown ? <UndoDeleteBar onUndo={undo} bottomInset={insets.bottom} /> : null}
      <LinkPicker
        visible={linking !== null}
        people={people}
        places={places}
        personId={linking?.personId ?? null}
        placeId={linking?.placeId ?? null}
        onCancel={() => setLinking(null)}
        onDone={async (links) => {
          const note = linking;
          setLinking(null);
          if (!note) return;
          try {
            await linkNote(await getDatabase(), note.id, links);
            reload();
          } catch {
            logEvent('note_link_failed');
            Alert.alert(t('notes:link.failed'));
          }
        }}
        topInset={insets.top}
        bottomInset={insets.bottom}
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
