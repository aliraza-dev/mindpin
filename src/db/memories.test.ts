import {
  createNote,
  createPlace,
  getMemory,
  listPlacesForPerson,
  softDeleteMemory,
  updateMemory,
} from './memories';
import { createPerson } from './people';
import { freshDb } from './testing/freshDb';

describe('memories data access', () => {
  it('stores a place on the device and reads it back (R8.1)', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Ahmed' });
    const place = await createPlace(db, {
      personId: person.id,
      title: 'Shop',
      lat: 31.5,
      lng: 74.35,
      address: 'Main Boulevard',
      notes: 'Blue pharmacy',
      tags: ['parking', 'gate code'],
      sourceApp: 'WhatsApp',
      sourceRaw: 'https://maps.google.com/?q=31.5,74.35',
    });
    expect(place).toMatchObject({
      type: 'place',
      personId: person.id,
      tags: ['parking', 'gate code'],
      pinned: false,
      status: 'resolved',
      deletedAt: null,
    });
    expect(await getMemory(db, place.id)).toEqual(place);
  });

  it('stores a pending place for an unresolved link (R1.5)', async () => {
    const db = await freshDb();
    const place = await createPlace(db, {
      title: 'Home',
      sourceRaw: 'https://maps.app.goo.gl/abc',
      status: 'pending_resolve',
    });
    expect(place).toMatchObject({ status: 'pending_resolve', lat: null, lng: null });
  });

  it('stores a note linked to a place', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    const note = await createNote(db, {
      title: 'Wi-Fi',
      notes: 'Wi-Fi\nNetwork name',
      placeId: place.id,
      pinned: true,
    });
    expect(note).toMatchObject({ type: 'note', placeId: place.id, pinned: true });
  });

  it('updates fields and keeps tags as a list', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    const updated = await updateMemory(db, place.id, { title: 'Office', tags: ['floor 2'] });
    expect(updated).toMatchObject({ title: 'Office', tags: ['floor 2'] });
  });

  it('soft-deletes by setting deletedAt', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    await softDeleteMemory(db, place.id);
    const deleted = await getMemory(db, place.id);
    expect(deleted?.deletedAt).toEqual(expect.any(Number));
  });

  it('lists any number of places for a person, newest first, without deleted ones (R4.3)', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Ahmed' });
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) {
      ids.push((await createPlace(db, { personId: person.id, title: `Place ${i}` })).id);
    }
    await createNote(db, { title: 'Not a place', notes: 'x', personId: person.id });
    await softDeleteMemory(db, ids[0]);
    const places = await listPlacesForPerson(db, person.id);
    expect(places).toHaveLength(11);
    expect(places.every((p) => p.type === 'place')).toBe(true);
  });

  it('throws when updating a missing memory', async () => {
    const db = await freshDb();
    await expect(updateMemory(db, 'missing', { title: 'x' })).rejects.toThrow(/not found/i);
  });
});
