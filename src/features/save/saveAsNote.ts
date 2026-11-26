// "Save as note": shared text with no location is kept as a note instead (R1.4, R10.9).
// Notes never count toward the free limit on places (R10.12).
import { createNote, type Memory } from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { noteTitle } from '../notes/noteText';

export type SaveAsNoteInput = {
  text: string;
  sourceApp?: string | null;
  personId?: string | null;
};

export async function saveAsNote(db: SqlDatabase, input: SaveAsNoteInput): Promise<Memory> {
  const text = input.text.trim();
  if (!text) throw new Error('The note is empty');
  return createNote(db, {
    title: noteTitle(text),
    notes: text,
    personId: input.personId ?? null,
    sourceApp: input.sourceApp ?? null,
    sourceRaw: input.text,
  });
}
