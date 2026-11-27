// T067: deleting a note, with Undo for 5 seconds (R10.10).
import { createNote, createPlace, getMemory, listNotes, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { searchMemories } from '../../db/search';
import { freshDb } from '../../db/testing/freshDb';
import { deleteNoteWithUndo, UNDO_WINDOW_MS } from './deleteNote';

async function setup() {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person' });
  const note = await createNote(db, {
    title: 'Gift ideas',
    notes: 'Gift ideas\nShawl, glasses case',
    personId: person.id,
    pinned: true,
  });
  return { db, note };
}

const found = async (db: Awaited<ReturnType<typeof freshDb>>, word: string) =>
  (await searchMemories(db, word)).map((r) => r.memory.id);

describe('deleteNoteWithUndo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('gives the user 5 seconds to undo', () => {
    expect(UNDO_WINDOW_MS).toBe(5000);
  });

  it('makes the note disappear at once', async () => {
    const { db, note } = await setup();
    await deleteNoteWithUndo(db, note.id);
    expect(await listNotes(db)).toEqual([]);
    expect(await found(db, 'shawl')).toEqual([]);
  });

  it('brings the note back unchanged when Undo is tapped in time', async () => {
    const { db, note } = await setup();
    const deletion = await deleteNoteWithUndo(db, note.id);
    await jest.advanceTimersByTimeAsync(4999);

    expect(await deletion.undo()).toBe(true);
    expect(await getMemory(db, note.id)).toEqual(note);
    expect((await listNotes(db)).map((n) => n.id)).toEqual([note.id]);
    expect(await found(db, 'shawl')).toEqual([note.id]);
    expect(await deletion.done).toBe('undone');

    // The note stays after the 5 seconds have passed.
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await getMemory(db, note.id)).toEqual(note);
  });

  it('removes the note permanently when the 5 seconds pass', async () => {
    const { db, note } = await setup();
    const deletion = await deleteNoteWithUndo(db, note.id);
    await jest.advanceTimersByTimeAsync(4999);
    expect(await getMemory(db, note.id)).not.toBeNull();

    await jest.advanceTimersByTimeAsync(1);
    expect(await deletion.done).toBe('deleted');
    expect(await getMemory(db, note.id)).toBeNull();
    // Undo is no longer possible.
    expect(await deletion.undo()).toBe(false);
    expect(await getMemory(db, note.id)).toBeNull();
  });

  it('removes the note permanently as soon as the user leaves the screen', async () => {
    const { db, note } = await setup();
    const deletion = await deleteNoteWithUndo(db, note.id);
    await jest.advanceTimersByTimeAsync(1000);

    await deletion.finish();
    expect(await getMemory(db, note.id)).toBeNull();
    expect(await deletion.done).toBe('deleted');
    expect(await deletion.undo()).toBe(false);
    // Finishing again, or the timer running out later, changes nothing.
    await deletion.finish();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await getMemory(db, note.id)).toBeNull();
  });

  it('handles two deletions independently', async () => {
    const { db, note } = await setup();
    const second = await createNote(db, { title: 'Second', notes: 'Second' });
    const first = await deleteNoteWithUndo(db, note.id);
    const later = await deleteNoteWithUndo(db, second.id);

    expect(await later.undo()).toBe(true);
    await jest.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(await first.done).toBe('deleted');
    expect(await getMemory(db, note.id)).toBeNull();
    expect(await getMemory(db, second.id)).not.toBeNull();
  });

  it('refuses anything that is not a saved note', async () => {
    const { db, note } = await setup();
    const place = await createPlace(db, { title: 'Home' });
    await softDeleteMemory(db, note.id);
    for (const id of ['missing', place.id, note.id]) {
      await expect(deleteNoteWithUndo(db, id)).rejects.toThrow(/note not found/i);
    }
    expect(await getMemory(db, place.id)).not.toBeNull();
  });
});
