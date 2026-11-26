import { freshDb } from './testing/freshDb';
import { inTransaction } from './transaction';
import { getSetting, setSetting } from './settings';

describe('inTransaction', () => {
  it('returns what the task returns and keeps its writes', async () => {
    const db = await freshDb();
    const value = await inTransaction(db, async () => {
      await setSetting(db, 'user_first_name', 'Sample');
      return 42;
    });
    expect(value).toBe(42);
    expect(await getSetting(db, 'user_first_name')).toBe('Sample');
  });

  it('undoes every write when the task fails', async () => {
    const db = await freshDb();
    await expect(
      inTransaction(db, async () => {
        await setSetting(db, 'user_first_name', 'Sample');
        throw new Error('stopped half way');
      }),
    ).rejects.toThrow('stopped half way');
    expect(await getSetting(db, 'user_first_name')).toBeNull();
  });
});
