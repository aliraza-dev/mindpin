// T030: who a place belongs to (R3.3, R3.7, R3.8, R3.11).
import { createNote, createPlace } from '../../db/memories';
import { createPerson, listPeople, type Person } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { recentPeople, resolvePersonChoice, suggestPeople } from './matchPerson';
import type { DeviceContact } from './types';

function person(name: string, contactRef: string | null = null): Person {
  return {
    id: `id-${name}`,
    name,
    phone: null,
    contactRef,
    photoUri: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

function contact(name: string, contactRef = `c-${name}`): DeviceContact {
  return { contactRef, name, phone: null, photoUri: null };
}

describe('recentPeople (R3.3)', () => {
  let clock = 1_000;
  beforeEach(() => {
    clock = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1_000));
  });
  afterEach(() => jest.restoreAllMocks());

  it('suggests the 3 most recently used people, most recent first', async () => {
    const db = await freshDb();
    const a = await createPerson(db, { name: 'A' });
    const b = await createPerson(db, { name: 'B' });
    const c = await createPerson(db, { name: 'C' });
    const d = await createPerson(db, { name: 'D' });
    expect((await recentPeople(db)).map((p) => p.name)).toEqual(['D', 'C', 'B']);

    await createPlace(db, { personId: a.id, title: 'Home' });
    await createNote(db, { personId: c.id, title: 'Note', notes: 'Note' });
    expect((await recentPeople(db)).map((p) => p.name)).toEqual(['C', 'A', 'D']);
    expect(b.id).not.toBe(d.id);
  });

  it('returns fewer when fewer people exist', async () => {
    const db = await freshDb();
    expect(await recentPeople(db)).toEqual([]);
    await createPerson(db, { name: 'A' });
    expect(await recentPeople(db)).toHaveLength(1);
  });
});

describe('suggestPeople', () => {
  it('suggests nothing until the user types', () => {
    expect(suggestPeople('   ', [person('Sara Malik')], [contact('Sara')])).toEqual([]);
  });

  it('shows a person whose name matches exactly, ignoring case, first (R3.8)', () => {
    const people = [person('Sara Malik'), person('sara'), person('Sarah Khan')];
    const result = suggestPeople('  SARA ', people, [contact('Sara')]);
    expect(result[0]).toEqual({ kind: 'person', person: people[1], exactName: true });
    expect(
      result.map((s) => (s.kind === 'person' ? s.person.name : `contact:${s.contact.name}`)),
    ).toEqual(['sara', 'Sara Malik', 'Sarah Khan', 'contact:Sara']);
  });

  it('matches the start of any word, not the middle of one', () => {
    const people = [person('Usman Khan'), person('Akhan Ali')];
    expect(
      suggestPeople('kh', people, []).map((s) => s.kind === 'person' && s.person.name),
    ).toEqual(['Usman Khan']);
    expect(suggestPeople('usman k', people, [])).toHaveLength(1);
  });

  it('shows the linked person instead of a contact that is already in MindPin (R3.7)', () => {
    const renamed = person('Ahmed (plumber)', 'c-1');
    const result = suggestPeople(
      'ahmed r',
      [renamed],
      [contact('Ahmed Raza', 'c-1'), contact('Ahmed Rauf', 'c-2')],
    );
    expect(result).toEqual([
      { kind: 'person', person: renamed, exactName: false },
      { kind: 'contact', contact: contact('Ahmed Rauf', 'c-2') },
    ]);
  });

  it('caps the list', () => {
    const contacts = Array.from({ length: 50 }, (_, i) => contact(`Ali ${i}`));
    expect(suggestPeople('ali', [], contacts, 5)).toHaveLength(5);
  });

  it('searches 1,000 contacts well within 300 ms (R3.2)', () => {
    const contacts = Array.from({ length: 1000 }, (_, i) => contact(`Person ${i} Family${i % 37}`));
    const people = Array.from({ length: 200 }, (_, i) =>
      person(`Saved ${i}`, `c-Person ${i} Family${i % 37}`),
    );
    const started = performance.now();
    const result = suggestPeople('fam', people, contacts);
    expect(performance.now() - started).toBeLessThan(300);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('resolvePersonChoice', () => {
  it('reuses the person already linked to a picked contact (R3.7)', async () => {
    const db = await freshDb();
    const existing = await createPerson(db, { name: 'Ahmed', contactRef: 'c-1' });
    const chosen = await resolvePersonChoice(db, {
      kind: 'contact',
      contact: { contactRef: 'c-1', name: 'Ahmed Raza', phone: '+10000000000', photoUri: null },
    });
    expect(chosen).toEqual(existing);
    expect(await listPeople(db)).toHaveLength(1);
  });

  it('creates a person from a new contact with name, phone, and photo reference', async () => {
    const db = await freshDb();
    const chosen = await resolvePersonChoice(db, {
      kind: 'contact',
      contact: {
        contactRef: 'c-2',
        name: 'Sara Malik',
        phone: '+10000000001',
        photoUri: 'content://p/2',
      },
    });
    expect(chosen).toMatchObject({
      name: 'Sara Malik',
      phone: '+10000000001',
      contactRef: 'c-2',
      photoUri: 'content://p/2',
    });
  });

  it('creates a new person for a typed name, never merging with a namesake (R3.8)', async () => {
    const db = await freshDb();
    const namesake = await createPerson(db, { name: 'Ali' });
    const chosen = await resolvePersonChoice(db, { kind: 'new', name: ' ali ' });
    expect(chosen?.id).not.toBe(namesake.id);
    expect(chosen?.name).toBe('ali');
    expect(await listPeople(db)).toHaveLength(2);
  });

  it('returns the picked existing person, and fails if they are gone', async () => {
    const db = await freshDb();
    const existing = await createPerson(db, { name: 'Usman' });
    expect(await resolvePersonChoice(db, { kind: 'existing', personId: existing.id })).toEqual(
      existing,
    );
    await expect(
      resolvePersonChoice(db, { kind: 'existing', personId: 'missing' }),
    ).rejects.toThrow(/not found/i);
  });

  it('allows saving without a person (R3.11)', async () => {
    const db = await freshDb();
    expect(await resolvePersonChoice(db, { kind: 'none' })).toBeNull();
    expect(await listPeople(db)).toHaveLength(0);
  });
});
