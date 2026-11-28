// Remembers the theme the user picked (R11.6). The choice lives in the settings table, so it
// survives closing the app and travels with a backup.
import { getDatabase } from '../../db/database';
import { getSetting, setSetting } from '../../db/settings';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import {
  isThemePreference,
  setThemePreference,
  type Scheme,
  type ThemePreference,
} from '../../ui/theme';

// Called once when the app opens. An unreadable or missing value means "follow the phone".
export async function loadThemePreference(
  openDatabase: () => Promise<SqlDatabase> = getDatabase,
): Promise<void> {
  try {
    const stored = await getSetting(await openDatabase(), 'theme');
    setThemePreference(isThemePreference(stored) ? stored : 'system');
  } catch {
    logEvent('theme_load_failed');
  }
}

// Applies the choice at once and stores it. If storing fails the choice still holds until the
// app is closed.
export async function chooseTheme(
  next: ThemePreference,
  openDatabase: () => Promise<SqlDatabase> = getDatabase,
): Promise<void> {
  setThemePreference(next);
  try {
    await setSetting(await openDatabase(), 'theme', next);
  } catch {
    logEvent('theme_save_failed');
  }
}

// The quick switch on Home: the opposite of what is showing now.
export function oppositeOf(scheme: Scheme): Scheme {
  return scheme === 'dark' ? 'light' : 'dark';
}
