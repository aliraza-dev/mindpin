import { getSchemaVersion, migrate } from './migrate';
import { openTestDatabase } from './testing/nodeSqlite';
import type { Migration } from './types';

const first: Migration = { version: 1, name: 'first', sql: 'CREATE TABLE a (id TEXT PRIMARY KEY);' };
const second: Migration = {
  version: 2,
  name: 'second',
  sql: "CREATE TABLE b (id TEXT PRIMARY KEY); INSERT INTO b (id) VALUES ('seed');",
};

async function tableExists(db: ReturnType<typeof openTestDatabase>, name: string) {
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  );
  return row !== null;
}

describe('migrate', () => {
  it('applies migrations in version order and records the version', async () => {
    const db = openTestDatabase();
    const version = await migrate(db, [second, first]);
    expect(version).toBe(2);
    expect(await getSchemaVersion(db)).toBe(2);
    expect(await tableExists(db, 'a')).toBe(true);
    expect(await tableExists(db, 'b')).toBe(true);
  });

  it('applies each migration only once', async () => {
    const db = openTestDatabase();
    await migrate(db, [first, second]);
    await migrate(db, [first, second]);
    const rows = await db.getAllAsync('SELECT id FROM b');
    expect(rows).toHaveLength(1);
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const db = openTestDatabase();
    const broken: Migration = {
      version: 2,
      name: 'broken',
      sql: 'CREATE TABLE c (id TEXT PRIMARY KEY); THIS IS NOT SQL;',
    };
    await expect(migrate(db, [first, broken])).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(1);
    expect(await tableExists(db, 'c')).toBe(false);
  });

  it('rejects duplicate version numbers', async () => {
    const db = openTestDatabase();
    await expect(migrate(db, [first, { ...second, version: 1 }])).rejects.toThrow(/duplicate/i);
  });
});
