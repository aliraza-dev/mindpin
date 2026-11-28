// T052: the home screen loads its own data and searches as the user types.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { createPlace } from '../../db/memories';
import { createPerson } from '../../db/people';
import { setSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { HomeScreen } from './HomeScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;

async function seeded() {
  const db = await freshDb();
  await setSetting(db, 'user_first_name', 'Bilal');
  const person = await createPerson(db, { name: 'Sample Person' });
  const shop = await createPlace(db, { personId: person.id, title: 'Shop', address: 'Gulberg Road' });
  const old = await createPlace(db, { title: 'Old office', address: 'Far Street' });
  await db.runAsync('UPDATE memory SET created_at = ? WHERE id = ?', [Date.now() - 240 * DAY, old.id]);
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, person, shop, old };
}

describe('HomeScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => jest.clearAllMocks());

  it('loads the greeting, the people, and the places not visited in a while', async () => {
    await seeded();
    await render(<HomeScreen />);
    expect(await screen.findByText(/^Good (morning|afternoon|evening), Bilal$/)).toBeTruthy();
    expect(screen.getByText('Sample Person')).toBeTruthy();
    expect(screen.getByText('Shop — not visited yet')).toBeTruthy();
    expect(screen.getByText('Saved 8 months ago, not visited yet')).toBeTruthy();
  });

  it('shows the empty message on a new install', async () => {
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    await render(<HomeScreen />);
    expect(await screen.findByText(/Nothing saved yet/)).toBeTruthy();
    expect(screen.getByText(/^Good (morning|afternoon|evening)$/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a place by hand' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/place/new');
  });

  it('searches the saved places as the user types, and returns to the lists when cleared', async () => {
    const { shop } = await seeded();
    await render(<HomeScreen />);
    const input = await screen.findByLabelText('Search everything you saved');

    await fireEvent.changeText(input, 'gul');
    expect(await screen.findByText('Results')).toBeTruthy();
    expect(screen.getByText('Sample Person · Gulberg Road')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Shop' }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/place/${shop.id}`);

    await fireEvent.changeText(input, 'zzzz');
    expect(await screen.findByText('Nothing matches "zzzz".')).toBeTruthy();

    await fireEvent.changeText(input, '');
    expect(await screen.findByText('Recently saved')).toBeTruthy();
  });

  it('switches between people and places, and opens them', async () => {
    const { person, old } = await seeded();
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Open Sample Person' }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/person/${person.id}`);

    await fireEvent.press(screen.getByRole('button', { name: 'Show places' }));
    expect(await screen.findByText('Far Street')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Old office to plan a visit' }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/place/${old.id}`);

    await fireEvent.press(screen.getByRole('button', { name: 'Open notes' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/notes');
  });
});
