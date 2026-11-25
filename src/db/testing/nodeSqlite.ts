// Test-only adapter: runs the data layer against Node's built-in SQLite (with FTS5),
// so database tests do not need a phone. Never imported by app code.
import { DatabaseSync } from 'node:sqlite';

import type { RunResult, SqlDatabase, SqlValue } from '../types';

export function openTestDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params: SqlValue[] = []): Promise<RunResult> {
      const result = db.prepare(source).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(source: string, params: SqlValue[] = []) {
      return db.prepare(source).all(...params) as T[];
    },
    async getFirstAsync<T>(source: string, params: SqlValue[] = []) {
      return (db.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
