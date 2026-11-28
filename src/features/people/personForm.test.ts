// T141: editing a person (R3.12; design.md "Limits on typed text").
import { createPlace } from '../../db/memories';
import { createPerson, getPerson } from '../../db/people';
import { searchMemories } from '../../db/search';
import { freshDb } from '../../db/testing/freshDb';
import { saveEditedPerson, validatePersonForm } from './personForm';

describe('validatePersonForm', () => {
  it('accepts a name with a phone number and tidies the spaces', () => {
    expect(
      validatePersonForm({ name: '  Sample   Person ', phone: ' +1 (000)  000-0000 ' }),
    ).toEqual({
      ok: true,
      value: { name: 'Sample Person', phone: '+1 (000) 000-0000' },
    });
  });

  it('stores an empty phone number as nothing', () => {
    expect(validatePersonForm({ name: 'Sample Person', phone: '   ' })).toEqual({
      ok: true,
      value: { name: 'Sample Person', phone: null },
    });
  });

  it('requires a name', () => {
    expect(validatePersonForm({ name: '  ', phone: '' })).toEqual({
      ok: false,
      errors: { name: 'nameRequired' },
    });
  });

  it('refuses a name over 100 characters and accepts one of exactly 100', () => {
    expect(validatePersonForm({ name: 'x'.repeat(101), phone: '' })).toEqual({
      ok: false,
      errors: { name: 'nameTooLong' },
    });
    expect(validatePersonForm({ name: 'x'.repeat(100), phone: '' }).ok).toBe(true);
  });

  it.each([
    ['letters', 'call me'],
    ['dial codes', '0300 0000000,,123#'],
    ['a star code', '*21*03000000000#'],
    ['a plus sign in the middle', '0300+0000000'],
    ['too few digits', '12'],
    ['too many digits', '1234567890123456'],
    ['too many characters', '1 2 3 4 5 6 7 8 9 0 1 2'],
  ])('refuses a phone number with %s', (_what, phone) => {
    expect(validatePersonForm({ name: 'Sample Person', phone })).toEqual({
      ok: false,
      errors: { phone: 'phoneInvalid' },
    });
  });

  it('accepts local and international numbers', () => {
    for (const phone of ['0300 0000000', '+92 300 0000000', '(000) 000-0000', '123']) {
      expect(validatePersonForm({ name: 'Sample Person', phone }).ok).toBe(true);
    }
  });
});

describe('saveEditedPerson', () => {
  it('changes the name and phone, and keeps the link to the phone contact', async () => {
    const db = await freshDb();
    const person = await createPerson(db, {
      name: 'Sample Person',
      phone: '0300 0000000',
      contactRef: 'c-1',
    });
    const result = await saveEditedPerson(db, person.id, {
      name: 'New Name',
      phone: '+92 300 0000000',
    });

    expect(result.ok).toBe(true);
    expect(await getPerson(db, person.id)).toMatchObject({
      name: 'New Name',
      phone: '+92 300 0000000',
      contactRef: 'c-1',
      createdAt: person.createdAt,
    });
  });

  it('removes the phone number when it is cleared', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Sample Person', phone: '0300 0000000' });
    await saveEditedPerson(db, person.id, { name: 'Sample Person', phone: '' });

    expect((await getPerson(db, person.id))?.phone).toBeNull();
  });

  it('writes nothing when the form is not valid', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Sample Person', phone: '0300 0000000' });
    const result = await saveEditedPerson(db, person.id, { name: '', phone: 'abc' });

    expect(result).toEqual({ ok: false, errors: { name: 'nameRequired', phone: 'phoneInvalid' } });
    expect(await getPerson(db, person.id)).toEqual(person);
  });

  it("makes the person's places findable by the new name, not the old one (R6.1)", async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Oldname Person' });
    const place = await createPlace(db, {
      personId: person.id,
      title: 'Home',
      address: 'Sample Street',
    });
    await saveEditedPerson(db, person.id, { name: 'Freshname Person', phone: '' });

    expect((await searchMemories(db, 'freshname')).map((r) => r.memory.id)).toEqual([place.id]);
    expect(await searchMemories(db, 'oldname')).toEqual([]);
  });

  it('refuses a person who is not in MindPin', async () => {
    const db = await freshDb();
    await expect(
      saveEditedPerson(db, '3f2504e0-4f89-41d3-9a0c-0305e82c3301', {
        name: 'Sample Person',
        phone: '',
      }),
    ).rejects.toThrow('Person not found');
  });
});
