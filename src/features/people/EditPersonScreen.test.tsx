// T141, T143: the edit form for a person, and deleting from it (R3.12, R3.13).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { getDatabase } from '../../db/database';
import { createPlace, getMemory } from '../../db/memories';
import { createPerson, getPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { EditPersonScreen } from './EditPersonScreen';

const mockRouter = { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

async function seeded(overrides: Partial<Parameters<typeof createPerson>[1]> = {}) {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person', phone: '0300 0000000', ...overrides });
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, person };
}

const save = () => screen.getByRole('button', { name: 'Save the changes to this person' });

type AlertButton = { text?: string; style?: string; onPress?: () => void | Promise<void> };
// The buttons of the confirmation that was last shown.
function confirmationButtons(): AlertButton[] {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return (calls[calls.length - 1]?.[2] ?? []) as AlertButton[];
}

describe('EditPersonScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('opens with the person as saved', async () => {
    const { person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);

    expect(await screen.findByRole('header', { name: 'Edit person' })).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Sample Person');
    expect(screen.getByLabelText('Phone number').props.value).toBe('0300 0000000');
    expect(screen.getByLabelText('Phone number').props.keyboardType).toBe('phone-pad');
  });

  it('saves a new name and phone number, then goes back', async () => {
    const { db, person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'New Name');
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '+92 300 0000000');
    await fireEvent.press(save());

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(await getPerson(db, person.id)).toMatchObject({ name: 'New Name', phone: '+92 300 0000000' });
  });

  it('says the phone contacts are not changed, for a person who came from them', async () => {
    const { person } = await seeded({ contactRef: 'c-1' });
    await render(<EditPersonScreen personId={person.id} />);
    expect(
      await screen.findByText("Changes stay in MindPin. Your phone's contacts are not changed."),
    ).toBeTruthy();
  });

  it('leaves that line out for a person typed in by hand', async () => {
    const { person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await screen.findByLabelText('Name');
    expect(screen.queryByText(/Your phone's contacts are not changed/)).toBeNull();
  });

  it('asks for a name and a valid phone number, and saves nothing until both are right', async () => {
    const { db, person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await fireEvent.changeText(await screen.findByLabelText('Name'), '   ');
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '0300,,123#');
    await fireEvent.press(save());

    expect(await screen.findByText('Type a name.')).toBeTruthy();
    expect(screen.getByText('Enter a valid phone number, for example +92 300 0000000.')).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(await getPerson(db, person.id)).toEqual(person);
  });

  it('stops typing at the limits', async () => {
    const { person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    expect((await screen.findByLabelText('Name')).props.maxLength).toBe(100);
    expect(screen.getByLabelText('Phone number').props.maxLength).toBe(20);
  });

  it('closes without saving on Cancel', async () => {
    const { db, person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Someone Else');
    await fireEvent.press(screen.getByRole('button', { name: 'Close without saving' }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect((await getPerson(db, person.id))?.name).toBe('Sample Person');
  });

  it('says so and stays open when the changes cannot be saved', async () => {
    const { db, person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await screen.findByLabelText('Name');
    await db.runAsync('DELETE FROM person WHERE id = ?', [person.id]);
    await fireEvent.press(save());

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('The changes could not be saved. Try again.'),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows "not found" for an id that is malformed or unknown', async () => {
    await seeded();
    for (const id of [null, '3f2504e0-4f89-41d3-9a0c-0305e82c3301']) {
      const { unmount } = await render(<EditPersonScreen personId={id} />);
      expect(await screen.findByText('This person is no longer in MindPin.')).toBeTruthy();
      await unmount();
    }
  });

  it('asks before deleting, and keeps the person on Cancel (R3.13)', async () => {
    const { db, person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Delete Sample Person from MindPin' }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Sample Person?',
      "Their places and notes are kept, under no person. Your phone's contacts are not changed.",
      expect.any(Array),
    );
    const buttons = confirmationButtons();
    expect(buttons.map((b) => [b.text, b.style])).toEqual([
      ['Cancel', 'cancel'],
      ['Delete', 'destructive'],
    ]);
    // Cancel has nothing to run: the person stays.
    expect(buttons[0].onPress).toBeUndefined();
    expect(await getPerson(db, person.id)).toEqual(person);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('deletes the person once confirmed, keeps their places, and returns to Home (R3.13)', async () => {
    const { db, person } = await seeded();
    const place = await createPlace(db, { personId: person.id, title: 'Home', address: 'Canal Road' });
    await render(<EditPersonScreen personId={person.id} />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Delete Sample Person from MindPin' }),
    );
    await confirmationButtons()[1].onPress?.();

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/'));
    expect(await getPerson(db, person.id)).toBeNull();
    expect(await getMemory(db, place.id)).toMatchObject({ personId: null, deletedAt: null });
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('says so and stays open when the person cannot be deleted', async () => {
    const { db, person } = await seeded();
    await render(<EditPersonScreen personId={person.id} />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Delete Sample Person from MindPin' }),
    );
    (getDatabase as jest.Mock).mockRejectedValueOnce(new Error('closed'));
    await confirmationButtons()[1].onPress?.();

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('The person could not be deleted. Try again.'),
    );
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(await getPerson(db, person.id)).toEqual(person);
  });
});
