// The subset of the expo-sqlite database API that the data layer uses.
// expo-sqlite's SQLiteDatabase satisfies it in the app; tests use a Node SQLite adapter.

export type SqlValue = string | number | null;

export type RunResult = { changes: number; lastInsertRowId: number };

export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlValue[]): Promise<RunResult>;
  getAllAsync<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export type Migration = {
  version: number;
  name: string;
  sql: string;
  // Set for migrations that rebuild a table (SQLite cannot alter a CHECK constraint in place).
  // The runner turns foreign keys off for the migration, checks that no link is left broken,
  // and turns them back on.
  foreignKeysOff?: boolean;
};
