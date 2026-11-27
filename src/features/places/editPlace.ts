// Editing and deleting a saved place (R4.4, R4.9, R4.10).
import { getMemory, softDeleteMemory, updateMemory, type Memory } from '../../db/memories';
import { inTransaction } from '../../db/transaction';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import { processMemory, type LookupDeps } from '../resolve/retryQueue';
import { validatePlaceForm, type PlaceFormErrors, type PlaceFormValues } from './placeForm';

async function savedPlace(db: SqlDatabase, placeId: string): Promise<Memory | null> {
  const place = await getMemory(db, placeId);
  return place && place.type === 'place' && place.deletedAt === null ? place : null;
}

export type EditPlaceResult =
  | {
      ok: true;
      // The place as written, before any lookup has filled in more.
      place: Memory;
      // Settles when the after-save lookup has run. It never rejects, and saving does not
      // wait for it.
      lookups: Promise<void>;
    }
  | { ok: false; errors: PlaceFormErrors };

// Checks the form again and writes it. The pin never moves here: a new address only changes
// the text. What is missing afterwards (the location of a place with no pin, or the address
// of a place whose address was emptied) is looked up, now or on the next connection.
export async function saveEditedPlace(
  db: SqlDatabase,
  placeId: string,
  values: PlaceFormValues,
  deps: LookupDeps,
): Promise<EditPlaceResult> {
  const written = await inTransaction(db, async () => {
    const existing = await savedPlace(db, placeId);
    if (!existing) throw new Error('Place not found');

    const hasPin = existing.lat !== null && existing.lng !== null;
    const checked = validatePlaceForm(values, { hasPin });
    if (!checked.ok) return checked;

    const edit = checked.value;
    const needsLookup = hasPin ? edit.address === null : edit.address !== existing.address;
    const place = await updateMemory(db, placeId, {
      ...edit,
      status: needsLookup ? 'pending_geocode' : existing.status,
    });
    return { ok: true as const, place };
  });

  if (!written.ok) return written;
  const { place } = written;
  const lookups =
    place.status === 'resolved'
      ? Promise.resolve()
      : processMemory(db, place.id, deps).then(
          () => undefined,
          () => logEvent('lookup_failed'),
        );
  return { ok: true, place, lookups };
}

// Deletes a place (R4.9). Its visits go with it, since they are only ever shown with the
// place. Notes linked to it are kept and lose only that link. Returns false when there was no
// such place to delete.
export async function deletePlace(db: SqlDatabase, placeId: string): Promise<boolean> {
  return inTransaction(db, async () => {
    if (!(await savedPlace(db, placeId))) return false;
    await softDeleteMemory(db, placeId);
    await db.runAsync(
      "UPDATE memory SET place_id = NULL, updated_at = max(updated_at, ?) WHERE place_id = ? AND type = 'note'",
      [Date.now(), placeId],
    );
    return true;
  });
}
