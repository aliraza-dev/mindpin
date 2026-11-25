// Test-only: an in-memory database with every app migration applied.
import { migrate } from '../migrate';
import { migrations } from '../migrations';
import type { SqlDatabase } from '../types';
import { openTestDatabase } from './nodeSqlite';

export async function freshDb(): Promise<SqlDatabase> {
  const db = openTestDatabase();
  await migrate(db, migrations);
  return db;
}
