// A deleted note is removed when its Undo time ends (deleteNote.ts). If the app is closed while
// Undo is still showing, the note is left marked deleted; this finishes the job at the next
// start (R10.10).
import { getDatabase } from '../../db/database';
import { removeDeletedNotes } from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';

// Removes every note that was left marked deleted. Returns how many. Places are not touched.
export function purgeDeletedNotes(db: SqlDatabase): Promise<number> {
  return removeDeletedNotes(db);
}

// Called once when the app opens, before any Undo button can be showing. A failure is logged by
// event name only and never crashes the app; the purge runs again at the next start.
export async function purgeDeletedNotesAtStart(
  openDatabase: () => Promise<SqlDatabase> = getDatabase,
): Promise<void> {
  try {
    await purgeDeletedNotes(await openDatabase());
  } catch {
    logEvent('note_purge_failed');
  }
}
