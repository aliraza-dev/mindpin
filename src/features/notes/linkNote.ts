// Linking a note to a person, a place, or both (R10.8). Linked notes are listed for the
// person and place screens by listNotesForPerson and listNotesForPlace in the database layer.
import { getMemory, updateMemory, type Memory } from '../../db/memories';
import { getPerson } from '../../db/people';
import type { SqlDatabase } from '../../db/types';

// Leave a field out to keep the current link; pass null to remove it.
export type NoteLinks = { personId?: string | null; placeId?: string | null };

export async function linkNote(db: SqlDatabase, noteId: string, links: NoteLinks): Promise<Memory> {
  const note = await getMemory(db, noteId);
  if (!note || note.type !== 'note' || note.deletedAt !== null) throw new Error('Note not found');

  if (links.personId && !(await getPerson(db, links.personId))) {
    throw new Error('Person not found');
  }
  if (links.placeId) {
    const place = await getMemory(db, links.placeId);
    if (!place || place.type !== 'place' || place.deletedAt !== null) {
      throw new Error('Place not found');
    }
  }
  return updateMemory(db, noteId, { personId: links.personId, placeId: links.placeId });
}
