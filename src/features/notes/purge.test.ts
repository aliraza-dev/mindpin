// T067: Recently Deleted and the 30-day purge (R10.10).
import {
  createNote,
  createPlace,
  getMemory,
  listDeletedNotes,
  listNotes,
  softDeleteMemory,
} from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import { purgeDeletedNotes, purgeDeletedNotesAtStart } from './purge';

const DAY = 24 * 60 * 60 * 1000;

describe('Recently Deleted', () => {
  it('moves a deleted note out of the Notes list and into Recently Deleted', async () => {
    const db = await freshDb();
    const kept = await createNote(db, { title: 'Kept', notes: 'Kept' });
    const gone = await createNote(db, { title: 'Gone', notes: 'Gone' });
    await softDeleteMemory(db, gone.id);

    expect((await listNotes(db)).map((n) => n.id)).toEqual([kept.id]);
    expect((await listDeletedNotes(db)).map((n) => n.id)).toEqual([gone.id]);
  });
});

describe('purgeDeletedNotes', () => {
  it('removes a note for good once it has been deleted for 30 days', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Gone', notes: 'Gone' });
    await softDeleteMemory(db, note.id);
    const deletedAt = (await getMemory(db, note.id))?.deletedAt ?? 0;

    expect(await purgeDeletedNotes(db, deletedAt + 30 * DAY - 1)).toBe(0);
    expect(await getMemory(db, note.id)).not.toBeNull();

    expect(await purgeDeletedNotes(db, deletedAt + 30 * DAY)).toBe(1);
    expect(await getMemory(db, note.id)).toBeNull();
    expect(await listDeletedNotes(db)).toEqual([]);
  });

  it('never removes notes that are not deleted, or places', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Kept', notes: 'Kept' });
    const place = await createPlace(db, { title: 'Home' });
    await softDeleteMemory(db, place.id);

    expect(await purgeDeletedNotes(db, Date.now() + 365 * DAY)).toBe(0);
    expect(await getMemory(db, note.id)).not.toBeNull();
    expect(await getMemory(db, place.id)).not.toBeNull();
  });
});

describe('purgeDeletedNotesAtStart', () => {
  it('opens the database and purges', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Gone', notes: 'Gone' });
    await db.runAsync('UPDATE memory SET deleted_at = 1 WHERE id = ?', [note.id]);
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
