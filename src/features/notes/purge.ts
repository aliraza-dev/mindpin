// Recently Deleted keeps a deleted note for 30 days, then it is removed for good (R10.10).
import { getDatabase } from '../../db/database';
import { purgeNotesDeletedBefore } from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';

const RECENTLY_DELETED_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Removes notes that have been in Recently Deleted for 30 days or more. Returns how many.
export function purgeDeletedNotes(db: SqlDatabase, now: number = Date.now()): Promise<number> {
  return purgeNotesDeletedBefore(db, now - RECENTLY_DELETED_DAYS * DAY_MS);
}

// Called once when the app opens. A failure is logged by event name only and never crashes
// the app; the purge simply runs again at the next start.
export async function purgeDeletedNotesAtStart(
  openDatabase: () => Promise<SqlDatabase> = getDatabase,
): Promise<void> {
  try {
    await purgeDeletedNotes(await openDatabase());
  } catch {
    logEvent('note_purge_failed');
  }
}
