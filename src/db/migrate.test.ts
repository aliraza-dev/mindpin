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

  describe('migrations that rebuild a table', () => {
    const parentAndChild: Migration = {
      version: 1,
      name: 'parent and child',
      sql: `
        CREATE TABLE parent (id TEXT PRIMARY KEY);
        CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent (id));
        INSERT INTO parent (id) VALUES ('p');
        INSERT INTO child (id, parent_id) VALUES ('c', 'p');
      `,
    };

    async function foreignKeysOn(db: ReturnType<typeof openTestDatabase>) {
      const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
      return row?.foreign_keys === 1;
    }

    it('runs with foreign keys off, then turns them back on', async () => {
      const db = openTestDatabase();
      const rebuild: Migration = {
        version: 2,
        name: 'rebuild parent',
        foreignKeysOff: true,
        sql: `
          CREATE TABLE parent_new (id TEXT PRIMARY KEY, extra TEXT);
          INSERT INTO parent_new (id) SELECT id FROM parent;
          DROP TABLE parent;
          ALTER TABLE parent_new RENAME TO parent;
        `,
      };
      await migrate(db, [parentAndChild, rebuild]);
      expect(await getSchemaVersion(db)).toBe(2);
      expect(await foreignKeysOn(db)).toBe(true);
      await expect(
        db.runAsync("INSERT INTO child (id, parent_id) VALUES ('c2', 'missing')"),
      ).rejects.toThrow();
    });

    it('rolls back a rebuild that would leave broken links', async () => {
      const db = openTestDatabase();
      const breaking: Migration = {
        version: 2,
        name: 'drop the parent row',
        foreignKeysOff: true,
        sql: 'DELETE FROM parent;',
      };
      await expect(migrate(db, [parentAndChild, breaking])).rejects.toThrow(/broken/i);
      expect(await getSchemaVersion(db)).toBe(1);
      expect(await db.getAllAsync('SELECT id FROM parent')).toHaveLength(1);
      expect(await foreignKeysOn(db)).toBe(true);
    });
  });

  it('rejects duplicate version numbers', async () => {
    const db = openTestDatabase();
    await expect(migrate(db, [first, { ...second, version: 1 }])).rejects.toThrow(/duplicate/i);
  });
});
