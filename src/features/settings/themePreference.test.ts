// T149: the chosen theme is remembered (R11.6).
import { getSetting, setSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import type { SqlDatabase } from '../../db/types';
import { getThemePreference, setThemePreference } from '../../ui/theme';
import { chooseTheme, loadThemePreference, oppositeOf } from './themePreference';

describe('theme preference', () => {
  afterEach(() => setThemePreference('system'));

  it('follows the phone until the user chooses', async () => {
    const db = await freshDb();
    await loadThemePreference(async () => db);
    expect(getThemePreference()).toBe('system');
  });

  it('applies a choice at once and remembers it for the next start', async () => {
    const db = await freshDb();
    await chooseTheme('dark', async () => db);
    expect(getThemePreference()).toBe('dark');
    expect(await getSetting(db, 'theme')).toBe('dark');

    setThemePreference('system');
    await loadThemePreference(async () => db);
    expect(getThemePreference()).toBe('dark');
  });

  it('treats an unreadable stored value as following the phone', async () => {
    const db = await freshDb();
    await setSetting(db, 'theme', 'purple');
    setThemePreference('dark');
    await loadThemePreference(async () => db);
    expect(getThemePreference()).toBe('system');
  });

  it('keeps the choice for this session when it cannot be stored', async () => {
    const broken = (async () => {
      throw new Error('no database');
    }) as () => Promise<SqlDatabase>;
    await chooseTheme('light', broken);
    expect(getThemePreference()).toBe('light');
    await loadThemePreference(broken);
    expect(getThemePreference()).toBe('light');
  });

  it('switches to the other theme from the quick switch', () => {
    expect(oppositeOf('light')).toBe('dark');
    expect(oppositeOf('dark')).toBe('light');
  });
});
