import type { SqlDatabase } from './types';

// Known keys. Settings are included in backup (design.md).
export type SettingKey = 'user_first_name' | 'pending_navigate' | 'theme';

export async function deleteSetting(db: SqlDatabase, key: SettingKey): Promise<void> {
  await db.runAsync('DELETE FROM setting WHERE key = ?', [key]);
}

export async function getSetting(db: SqlDatabase, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM setting WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(db: SqlDatabase, key: SettingKey, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
