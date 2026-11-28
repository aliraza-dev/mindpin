// T149: choosing the theme in Settings (R11.6).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { getSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { getThemePreference, setThemePreference } from '../../ui/theme';
import { SettingsScreen } from './SettingsScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

describe('SettingsScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  afterEach(() => setThemePreference('system'));

  it('starts on "Same as phone" and offers light and dark', async () => {
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    await render(<SettingsScreen />);
    expect(screen.getByRole('button', { name: 'Use the same theme as the phone' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Always use the light theme' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Always use the dark theme' })).not.toBeSelected();
  });

  it('applies the chosen theme at once and remembers it', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Always use the dark theme' }));
    expect(getThemePreference()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Always use the dark theme' })).toBeSelected();
    await waitFor(async () => expect(await getSetting(db, 'theme')).toBe('dark'));
  });
});
