import type { Migration, SqlDatabase } from './types';

// The schema version lives in SQLite's built-in user_version header field.
export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

// Applies every migration newer than the current version, in order, each in its own transaction.
// A failing migration rolls back and stops; earlier migrations stay applied.
export async function migrate(db: SqlDatabase, migrations: Migration[]): Promise<number> {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].version === sorted[i - 1].version) {
      throw new Error(`Duplicate migration version ${sorted[i].version}`);
    }
  }

  let current = await getSchemaVersion(db);
  for (const migration of sorted) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      // PRAGMA does not accept bound parameters; version is a trusted integer from code.
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
    current = migration.version;
  }
  return current;
}
