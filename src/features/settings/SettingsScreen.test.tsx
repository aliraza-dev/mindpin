// T149: choosing the theme in Settings (R11.6).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { getSetting, setSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { getThemePreference, setThemePreference } from '../../ui/theme';
import { SettingsScreen } from './SettingsScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
// The version comes from the app's own config, which tests do not have.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));
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

  it('opens the profile from its row, which shows the saved name', async () => {
    const db = await freshDb();
    await setSetting(db, 'user_first_name', 'Bilal');
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<SettingsScreen />);
    expect(await screen.findByText('Bilal')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open your profile' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/profile');
  });

  it('says what happens to the data, and which version this is', async () => {
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    await render(<SettingsScreen />);
    expect(screen.getByText('Your address book is never uploaded.')).toBeTruthy();
    expect(screen.getByText('MindPin does not track where you are.')).toBeTruthy();
    expect(screen.getByText(/^Version \d+\.\d+/)).toBeTruthy();
  });
});
