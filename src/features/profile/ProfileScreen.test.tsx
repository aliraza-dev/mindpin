// The profile screen (R7.8).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { getSetting, setSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { ProfileScreen } from './ProfileScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

async function seeded(firstName?: string) {
  const db = await freshDb();
  if (firstName) await setSetting(db, 'user_first_name', firstName);
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return db;
}

describe('ProfileScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => jest.clearAllMocks());

  it('shows the saved name and what has been saved', async () => {
    await seeded('Bilal');
    await render(<ProfileScreen />);
    expect(await screen.findByRole('header', { name: 'Bilal' })).toBeTruthy();
    expect(screen.getByLabelText('First name').props.value).toBe('Bilal');
    expect(screen.getByLabelText('0 people saved')).toBeTruthy();
    expect(screen.getByLabelText('0 places saved')).toBeTruthy();
    expect(screen.getByLabelText('0 notes')).toBeTruthy();
  });

  it('saves a new first name', async () => {
    const db = await seeded();
    await render(<ProfileScreen />);
    expect(await screen.findByRole('header', { name: 'Your profile' })).toBeTruthy();
    const save = () => screen.getByRole('button', { name: 'Save your first name' });
    expect(save()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('First name'), '  Sara ');
    await fireEvent.press(save());
    await waitFor(async () => expect(await getSetting(db, 'user_first_name')).toBe('Sara'));
    expect(await screen.findByRole('header', { name: 'Sara' })).toBeTruthy();
  });

  it('goes back from the back button', async () => {
    await seeded();
    await render(<ProfileScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Go back' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
