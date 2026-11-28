// T070: linking a note to a person, a place, or both (R10.8).
import {
  createNote,
  createPlace,
  listNotesForPerson,
  listNotesForPlace,
  softDeleteMemory,
} from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { linkNote } from './linkNote';

async function setup() {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person' });
  const place = await createPlace(db, { personId: person.id, title: 'Shop' });
  const note = await createNote(db, { title: 'Things to bring', notes: 'Things to bring\nSweets' });
  return { db, person, place, note };
}

describe('linkNote', () => {
  it('links a note to a person, and it appears on that person only', async () => {
    const { db, person, place, note } = await setup();
    const linked = await linkNote(db, note.id, { personId: person.id });
    expect(linked).toMatchObject({ personId: person.id, placeId: null });
    expect((await listNotesForPerson(db, person.id)).map((n) => n.id)).toEqual([note.id]);
    expect(await listNotesForPlace(db, place.id)).toEqual([]);
  });

  it('links a note to a place, and to both', async () => {
    const { db, person, place, note } = await setup();
    await linkNote(db, note.id, { placeId: place.id });
    expect((await listNotesForPlace(db, place.id)).map((n) => n.id)).toEqual([note.id]);
    expect(await listNotesForPerson(db, person.id)).toEqual([]);

    const both = await linkNote(db, note.id, { personId: person.id });
    expect(both).toMatchObject({ personId: person.id, placeId: place.id });
    expect(await listNotesForPerson(db, person.id)).toHaveLength(1);
    expect(await listNotesForPlace(db, place.id)).toHaveLength(1);
  });

  it('removes a link when it is set to nothing', async () => {
    const { db, person, place, note } = await setup();
    await linkNote(db, note.id, { personId: person.id, placeId: place.id });
    const unlinked = await linkNote(db, note.id, { personId: null });
    expect(unlinked).toMatchObject({ personId: null, placeId: place.id });
    expect(await listNotesForPerson(db, person.id)).toEqual([]);
  });

  it('lists linked notes newest edit first, without places or deleted notes', async () => {
    const { db, person, note } = await setup();
    let clock = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
    const second = await createNote(db, { title: 'Second', notes: 'Second', personId: person.id });
    const deleted = await createNote(db, {
      title: 'Deleted',
      notes: 'Deleted',
      personId: person.id,
    });
    await softDeleteMemory(db, deleted.id);
    await linkNote(db, note.id, { personId: person.id });
    jest.restoreAllMocks();

    expect((await listNotesForPerson(db, person.id)).map((n) => n.id)).toEqual([
      note.id,
      second.id,
    ]);
  });

  it('refuses links to things that do not exist or are the wrong kind', async () => {
    const { db, person, place, note } = await setup();
    await expect(linkNote(db, 'missing', { personId: person.id })).rejects.toThrow(
      /note not found/i,
    );
    await expect(linkNote(db, place.id, { personId: person.id })).rejects.toThrow(
      /note not found/i,
    );
    await expect(linkNote(db, note.id, { personId: 'missing' })).rejects.toThrow(
      /person not found/i,
    );
    await expect(linkNote(db, note.id, { placeId: note.id })).rejects.toThrow(/place not found/i);
    await softDeleteMemory(db, place.id);
    await expect(linkNote(db, note.id, { placeId: place.id })).rejects.toThrow(/place not found/i);
  });
});
