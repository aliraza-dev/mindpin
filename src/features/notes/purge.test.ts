// T067: finishing deletions that were interrupted because the app closed while Undo was
// showing (R10.10).
import { createNote, createPlace, getMemory, softDeleteMemory } from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import { purgeDeletedNotes, purgeDeletedNotesAtStart } from './purge';

describe('purgeDeletedNotes', () => {
  it('removes notes that were left deleted', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Gone', notes: 'Gone' });
    await softDeleteMemory(db, note.id);

    expect(await purgeDeletedNotes(db)).toBe(1);
    expect(await getMemory(db, note.id)).toBeNull();
  });

  it('never removes notes that are not deleted, or places', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Kept', notes: 'Kept' });
    const place = await createPlace(db, { title: 'Home' });
    await softDeleteMemory(db, place.id);

    expect(await purgeDeletedNotes(db)).toBe(0);
    expect(await getMemory(db, note.id)).not.toBeNull();
    expect(await getMemory(db, place.id)).not.toBeNull();
  });
});

describe('purgeDeletedNotesAtStart', () => {
  it('opens the database and purges', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Gone', notes: 'Gone' });
    await softDeleteMemory(db, note.id);
    await purgeDeletedNotesAtStart(async () => db);
    expect(await getMemory(db, note.id)).toBeNull();
  });

  it('logs by event name only, and does not throw, when it cannot run', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    await expect(
      purgeDeletedNotesAtStart(() => Promise.reject(new Error('disk problem'))),
    ).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledWith('[mindpin]', 'note_purge_failed', {});
    info.mockRestore();
  });
});
