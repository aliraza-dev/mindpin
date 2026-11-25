import { openDatabaseAsync } from 'expo-sqlite';

import { migrate } from './migrate';
import { migrations } from './migrations';
import type { SqlDatabase } from './types';

const DATABASE_NAME = 'mindpin.db';

let opening: Promise<SqlDatabase> | null = null;

// Opens the on-device database once, turns on foreign keys and write-ahead logging
// (so a save interrupted by closing the app is not half-written), and applies migrations.
export function getDatabase(): Promise<SqlDatabase> {
  if (!opening) {
    opening = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const adapter: SqlDatabase = {
        execAsync: (source) => db.execAsync(source),
        runAsync: (source, params = []) => db.runAsync(source, params),
        getAllAsync: (source, params = []) => db.getAllAsync(source, params),
        getFirstAsync: (source, params = []) => db.getFirstAsync(source, params),
        withTransactionAsync: (task) => db.withTransactionAsync(task),
      };
      await migrate(adapter, migrations);
      return adapter;
    })().catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}
