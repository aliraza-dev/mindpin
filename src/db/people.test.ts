import { createNote, createPlace, getMemory, softDeleteMemory } from './memories';
import {
  createPerson,
  deletePerson,
  findPersonByContactRef,
  getPerson,
  listPeople,
  updatePerson,
} from './people';
import { listPlaceSummaries } from './placeSummaries';
import { searchMemories } from './search';
import { freshDb } from './testing/freshDb';

describe('people data access', () => {
  it('creates and reads a person', async () => {
    const db = await freshDb();
    const created = await createPerson(db, {
      name: 'Sara Malik',
      phone: '+920000000000',
      contactRef: 'c-1',
      photoUri: 'content://photo/1',
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getPerson(db, created.id)).toEqual(created);
  });

  it('stores optional fields as null when not given', async () => {
    const db = await freshDb();
    const created = await createPerson(db, { name: 'Usman' });
    expect(created).toMatchObject({ phone: null, contactRef: null, photoUri: null });
  });

  it('rejects an empty name', async () => {
    const db = await freshDb();
    await expect(createPerson(db, { name: '   ' })).rejects.toThrow(/name/i);
  });

  it('updates fields and the updated time', async () => {
    const db = await freshDb();
    const created = await createPerson(db, { name: 'Usman' });
    const updated = await updatePerson(db, created.id, { name: 'Usman Khan', phone: '+92111' });
    expect(updated).toMatchObject({ name: 'Usman Khan', phone: '+92111' });
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it('finds a person by device contact ID (R3.7)', async () => {
    const db = await freshDb();
    const created = await createPerson(db, { name: 'Ahmed', contactRef: 'c-9' });
    expect(await findPersonByContactRef(db, 'c-9')).toEqual(created);
    expect(await findPersonByContactRef(db, 'c-0')).toBeNull();
  });

  it('lists people by name', async () => {
    const db = await freshDb();
    await createPerson(db, { name: 'Zara' });
    await createPerson(db, { name: 'ahmed' });
    const names = (await listPeople(db)).map((p) => p.name);
    expect(names).toEqual(['ahmed', 'Zara']);
  });

  it('returns null for an unknown id', async () => {
    const db = await freshDb();
    expect(await getPerson(db, 'missing')).toBeNull();
  });
});

describe('deletePerson (R3.13)', () => {
  async function seeded() {
    const db = await freshDb();
    const person = await createPerson(db, {
      name: 'Zainab Sample',
      phone: '0300 0000000',
      contactRef: 'c-1',
    });
    const place = await createPlace(db, {
      personId: person.id,
      title: 'Home',
      address: 'Canal Road',
      lat: 1.5,
      lng: 2.5,
      notes: 'White gate',
      tags: ['Gate code 4471'],
    });
    const note = await createNote(db, {
      title: 'Wi-Fi',
      notes: 'Wi-Fi\nNetwork name',
      personId: person.id,
      placeId: place.id,
    });
    return { db, person, place, note };
  }

  it('removes the person, so their name and phone number are no longer stored', async () => {
    const { db, person } = await seeded();
    expect(await deletePerson(db, person.id)).toBe(true);

    expect(await getPerson(db, person.id)).toBeNull();
    expect(await listPeople(db)).toEqual([]);
    expect(await findPersonByContactRef(db, 'c-1')).toBeNull();
  });

  it('keeps their places and notes, under no person', async () => {
    const { db, person, place, note } = await seeded();
    await deletePerson(db, person.id);

    expect(await getMemory(db, place.id)).toMatchObject({
      personId: null,
      deletedAt: null,
      title: 'Home',
      address: 'Canal Road',
      lat: 1.5,
      lng: 2.5,
      notes: 'White gate',
      tags: ['Gate code 4471'],
    });
    expect(await getMemory(db, note.id)).toMatchObject({
      personId: null,
      placeId: place.id,
      deletedAt: null,
      notes: 'Wi-Fi\nNetwork name',
    });
    expect(await listPlaceSummaries(db)).toMatchObject([
      { place: { id: place.id }, personName: null },
    ]);
  });

  it("stops search finding their places by the person's name, but not by anything else", async () => {
    const { db, person, place } = await seeded();
    expect((await searchMemories(db, 'zainab')).length).toBeGreaterThan(0);
    await deletePerson(db, person.id);

    expect(await searchMemories(db, 'zainab')).toEqual([]);
    expect((await searchMemories(db, 'canal')).map((r) => r.memory.id)).toEqual([place.id]);
  });

  it('also lets go of places that were already deleted', async () => {
    const { db, person, place } = await seeded();
    await softDeleteMemory(db, place.id);

    expect(await deletePerson(db, person.id)).toBe(true);
    expect((await getMemory(db, place.id))?.personId).toBeNull();
  });

  it('leaves other people and their places alone', async () => {
    const { db, person } = await seeded();
    const other = await createPerson(db, { name: 'Other Sample' });
    const otherPlace = await createPlace(db, {
      personId: other.id,
      title: 'Shop',
      address: 'Mall Road',
    });
    await deletePerson(db, person.id);

    expect((await listPeople(db)).map((p) => p.id)).toEqual([other.id]);
    expect((await getMemory(db, otherPlace.id))?.personId).toBe(other.id);
  });

  it('does nothing for a person who is not in MindPin', async () => {
    const { db, person } = await seeded();
    expect(await deletePerson(db, '3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(false);
    expect(await getPerson(db, person.id)).not.toBeNull();
  });
});
