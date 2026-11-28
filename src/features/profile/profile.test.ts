// The profile: the user's first name and what they have saved (R7.8).
import { createNote, createPlace } from '../../db/memories';
import { createPerson } from '../../db/people';
import { getSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import { cleanFirstName, FIRST_NAME_LIMIT, loadProfile, saveFirstName } from './profile';

describe('profile', () => {
  it('tidies the name and refuses one that is too long', () => {
    expect(cleanFirstName('  Sample   Name ')).toEqual({ ok: true, firstName: 'Sample Name' });
    expect(cleanFirstName('   ')).toEqual({ ok: true, firstName: null });
    expect(cleanFirstName('a'.repeat(FIRST_NAME_LIMIT + 1))).toEqual({
      ok: false,
      error: 'tooLong',
    });
  });

  it('stores the name, and removes it when it is emptied', async () => {
    const db = await freshDb();
    await saveFirstName(db, ' Sample ');
    expect(await getSetting(db, 'user_first_name')).toBe('Sample');
    await saveFirstName(db, '');
    expect(await getSetting(db, 'user_first_name')).toBeNull();
    expect((await saveFirstName(db, 'a'.repeat(60))).ok).toBe(false);
    expect(await getSetting(db, 'user_first_name')).toBeNull();
  });

  it('counts the people, places, and notes saved', async () => {
    const db = await freshDb();
    expect(await loadProfile(db)).toEqual({ firstName: null, people: 0, places: 0, notes: 0 });
    const person = await createPerson(db, { name: 'Sample Person' });
    await createPlace(db, { personId: person.id, title: 'Shop', lat: 1, lng: 2 });
    await createNote(db, { title: 'Trip', notes: 'Trip' });
    await saveFirstName(db, 'Sample');
    expect(await loadProfile(db)).toEqual({ firstName: 'Sample', people: 1, places: 1, notes: 1 });
  });
});
