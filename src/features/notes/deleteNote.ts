// Deleting a note (R10.10). The note disappears at once and can be brought back with Undo for
// 5 seconds while the user stays on the same screen. After that it is gone for good; there is
// no Recently Deleted list.
import {
  getMemory,
  removeDeletedNotes,
  restoreDeletedNote,
  softDeleteMemory,
} from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';

export const UNDO_WINDOW_MS = 5000;

export type DeletionOutcome = 'undone' | 'deleted';

export type PendingNoteDeletion = {
  // Brings the note back unchanged. False when the 5 seconds are over or the deletion was
  // already finished.
  undo(): Promise<boolean>;
  // Removes the note for good now. The screen calls this when the user leaves it.
  finish(): Promise<void>;
  // Settles when the Undo button should go away, with what happened to the note.
  done: Promise<DeletionOutcome>;
};

export async function deleteNoteWithUndo(
  db: SqlDatabase,
  noteId: string,
  undoMs: number = UNDO_WINDOW_MS,
): Promise<PendingNoteDeletion> {
  const note = await getMemory(db, noteId);
  if (!note || note.type !== 'note' || note.deletedAt !== null) throw new Error('Note not found');

  // Hidden from lists and search straight away; the row stays until the Undo time is over.
  await softDeleteMemory(db, noteId);

  let open = true;
  let settle: (outcome: DeletionOutcome) => void = () => {};
  const done = new Promise<DeletionOutcome>((resolve) => {
    settle = resolve;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = async (): Promise<void> => {
    if (!open) return;
    open = false;
    clearTimeout(timer);
    try {
      await removeDeletedNotes(db, noteId);
    } catch {
      // The note stays hidden and is removed when the app next starts (purge.ts).
      logEvent('note_delete_failed');
    }
    settle('deleted');
  };

  timer = setTimeout(() => void finish(), undoMs);

  return {
    async undo() {
      if (!open) return false;
      open = false;
      clearTimeout(timer);
      const restored = await restoreDeletedNote(db, noteId, note.updatedAt);
      settle(restored ? 'undone' : 'deleted');
      return restored;
    },
    finish,
    done,
  };
}
