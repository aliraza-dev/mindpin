import { deleteSetting, getSetting, setSetting } from './settings';
import { freshDb } from './testing/freshDb';

describe('settings data access', () => {
  it('returns null for a missing key', async () => {
    const db = await freshDb();
    expect(await getSetting(db, 'user_first_name')).toBeNull();
  });

  it('stores and overwrites a value', async () => {
    const db = await freshDb();
    await setSetting(db, 'user_first_name', 'Bilal');
    await setSetting(db, 'user_first_name', 'Ali');
    expect(await getSetting(db, 'user_first_name')).toBe('Ali');
  });

  it('deletes a value, and deleting a missing one is harmless', async () => {
    const db = await freshDb();
    await setSetting(db, 'pending_navigate', '{}');
    await deleteSetting(db, 'pending_navigate');
    await deleteSetting(db, 'pending_navigate');
    expect(await getSetting(db, 'pending_navigate')).toBeNull();
  });
});
