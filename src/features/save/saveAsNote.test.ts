// T071: saving shared text as a note (R10.9, R10.12).
import { countSavedPlaces, createPlace, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { searchMemories } from '../../db/search';
import { freshDb } from '../../db/testing/freshDb';
import { saveAsNote } from './saveAsNote';

describe('saveAsNote (R10.9)', () => {
  it('saves the shared text as a note, titled by its first line', async () => {
    const db = await freshDb();
    const note = await saveAsNote(db, {
      text: '  Bring the charger box\nShopkeeper said it is needed for warranty  ',
      sourceApp: 'WhatsApp',
    });
    expect(note).toMatchObject({
      type: 'note',
      title: 'Bring the charger box',
      notes: 'Bring the charger box\nShopkeeper said it is needed for warranty',
      sourceApp: 'WhatsApp',
      personId: null,
      lat: null,
    });
    expect((await searchMemories(db, 'warranty')).map((r) => r.memory.id)).toEqual([note.id]);
  });

  it('can link the note to a person straight away', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Sample Person' });
    const note = await saveAsNote(db, { text: 'Come by Friday', personId: person.id });
    expect(note.personId).toBe(person.id);
  });

  it('refuses empty text', async () => {
    const db = await freshDb();
    await expect(saveAsNote(db, { text: '  \n ' })).rejects.toThrow(/empty/i);
  });
});

describe('the place count used for the free limit (R10.12)', () => {
  it('counts saved places only: not notes, and not deleted places', async () => {
    const db = await freshDb();
    await createPlace(db, { title: 'Home' });
    const deleted = await createPlace(db, { title: 'Old flat' });
    await softDeleteMemory(db, deleted.id);
    expect(await countSavedPlaces(db)).toBe(1);

    await saveAsNote(db, { text: 'A note' });
    await saveAsNote(db, { text: 'Another note' });
    expect(await countSavedPlaces(db)).toBe(1);
  });
});
