import type { SqlDatabase } from './types';

// Runs the task in one transaction and returns its result. If the task throws, or the app is
// closed part way, none of its writes are kept (non-functional: reliability).
export async function inTransaction<T>(db: SqlDatabase, task: () => Promise<T>): Promise<T> {
  const box: { value?: T } = {};
  await db.withTransactionAsync(async () => {
    box.value = await task();
  });
  return box.value as T;
}
