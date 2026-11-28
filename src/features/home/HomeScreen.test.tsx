// T052: the home screen loads its own data and searches as the user types.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, BackHandler, type AlertButton } from 'react-native';

import { getDatabase } from '../../db/database';
import { createPlace, getMemory } from '../../db/memories';
import { createPerson, getPerson } from '../../db/people';
import { setSetting } from '../../db/settings';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { getThemePreference, setThemePreference } from '../../ui/theme';
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
  const shop = await createPlace(db, {
    personId: person.id,
    title: 'Shop',
    address: 'Gulberg Road',
  });
  const old = await createPlace(db, { title: 'Old office', address: 'Far Street' });
  await db.runAsync('UPDATE memory SET created_at = ? WHERE id = ?', [
    Date.now() - 240 * DAY,
    old.id,
  ]);
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

  it('empties the search on the Back button of the phone instead of leaving the app (R6.1)', async () => {
    const listen = jest.spyOn(BackHandler, 'addEventListener');
    await seeded();
    await render(<HomeScreen />);
    // With nothing typed, Back is left alone.
    expect(listen).not.toHaveBeenCalled();
    const input = await screen.findByLabelText('Search everything you saved');
    await fireEvent.changeText(input, 'gul');
    expect(await screen.findByText('Results')).toBeTruthy();
    // The handler the screen gave the phone's Back button.
    const handler = listen.mock.calls[listen.mock.calls.length - 1][1];
    await act(async () => {
      expect((handler as () => boolean)()).toBe(true);
    });
    expect(await screen.findByText('Recently saved')).toBeTruthy();
    expect(screen.getByLabelText('Search everything you saved').props.value).toBe('');
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

  it('adds a place or a note from the floating + button (R4.7, R6.5)', async () => {
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    await render(<HomeScreen />);
    const plus = await screen.findByRole('button', { name: 'Add a place or a note' });
    await fireEvent.press(plus);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a place by hand' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/place/new');

    await fireEvent.press(screen.getByRole('button', { name: 'Add a place or a note' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Write a new note' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/note/[id]', params: { id: 'new' } });
  });

  it('deletes a person from the list only after the question is answered Delete (R3.13)', async () => {
    const { db, person, shop } = await seeded();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete Sample Person' }));
    expect(alert).toHaveBeenCalledWith(
      'Delete Sample Person?',
      expect.stringContaining('places and notes are kept'),
      expect.any(Array),
    );
    expect(await getPerson(db, person.id)).not.toBeNull();

    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((button) => button.text)).toEqual(['Cancel', 'Delete']);
    buttons[1].onPress?.();
    await waitFor(async () => expect(await getPerson(db, person.id)).toBeNull());
    await waitFor(() => expect(screen.queryByText('Sample Person')).toBeNull());
    // The person's place is kept (R3.13).
    expect((await getMemory(db, shop.id))?.deletedAt).toBeNull();
    alert.mockRestore();
  });

  it('deletes a place from the list after the same question (R4.4)', async () => {
    const { db, shop } = await seeded();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Show places' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Shop' }));
    expect(alert).toHaveBeenCalledWith('Delete Shop?', expect.any(String), expect.any(Array));
    expect((await getMemory(db, shop.id))?.deletedAt).toBeNull();
    (alert.mock.calls[0][2] as AlertButton[])[1].onPress?.();
    await waitFor(async () => expect((await getMemory(db, shop.id))?.deletedAt).not.toBeNull());
    alert.mockRestore();
  });

  it('opens the edit forms from the swipe actions', async () => {
    const { person } = await seeded();
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Edit Sample Person' }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/person/${person.id}/edit`);
  });

  it('switches the theme from the button at the top (R11.6)', async () => {
    await seeded();
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Switch to the dark theme' }));
    expect(getThemePreference()).toBe('dark');
    expect(await screen.findByRole('button', { name: 'Switch to the light theme' })).toBeTruthy();
    setThemePreference('system');
  });
});
