import { createPerson, findPersonByContactRef, getPerson, listPeople, updatePerson } from './people';
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
