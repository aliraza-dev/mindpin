// T054: the edit form for a place (R4.1, R4.2, R4.4, R4.10).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { getDatabase } from '../../db/database';
import { createNote, createPlace, getMemory, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { EditPlaceScreen } from './EditPlaceScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));
// The form must never reach the network in a test.
jest.mock('../save/lookups', () => ({
  deviceLookups: {
    resolveLink: jest.fn().mockResolvedValue({ kind: 'retry' }),
    geocoder: {
      addressFor: jest.fn().mockResolvedValue({ kind: 'retry' }),
      coordinatesFor: jest.fn().mockResolvedValue({ kind: 'retry' }),
    },
  },
}));

async function seeded(overrides: Parameters<typeof createPlace>[1] | object = {}) {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person' });
  const place = await createPlace(db, {
    personId: person.id,
    title: 'Home',
    address: 'House 22, Sample Street',
    lat: 1.5,
    lng: 2.5,
    notes: 'White gate',
    tags: ['Gate code 4471', '2nd floor'],
    ...overrides,
  });
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, person, place };
}

const save = () => screen.getByRole('button', { name: 'Save the changes to this place' });

describe('EditPlaceScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('opens with the place as it is saved', async () => {
    const { place } = await seeded();
    await render(<EditPlaceScreen placeId={place.id} />);

    expect(await screen.findByRole('header', { name: 'Edit place' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Label this place Home' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Label this place Shop' })).not.toBeSelected();
    expect(screen.getByLabelText('Address').props.value).toBe('House 22, Sample Street');
    expect(screen.getByLabelText('Notes for next time').props.value).toBe('White gate');
    // The saved tags are pills; nothing is being typed yet.
    expect(screen.getByLabelText('Tags').props.value).toBe('');
    expect(screen.getByText('Gate code 4471')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove tag 2nd floor' })).toBeTruthy();
    expect(screen.queryByLabelText('Your label')).toBeNull();
  });

  it('saves a new label, address, notes, and tags, then goes back', async () => {
    const { db, place } = await seeded();
    await render(<EditPlaceScreen placeId={place.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Label this place Office' }));
    await fireEvent.changeText(screen.getByLabelText('Address'), 'Canal Road');
    await fireEvent.changeText(screen.getByLabelText('Notes for next time'), 'Blue door');
    // The two saved tags are taken away with their crosses, and two new ones typed.
    await fireEvent.press(screen.getByRole('button', { name: 'Remove tag Gate code 4471' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove tag 2nd floor' }));
    await fireEvent.changeText(screen.getByLabelText('Tags'), 'Parking, Floor 3');
    await fireEvent.press(save());

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(await getMemory(db, place.id)).toMatchObject({
      title: 'Office',
      address: 'Canal Road',
      notes: 'Blue door',
      tags: ['Parking', 'Floor 3'],
      lat: 1.5,
      lng: 2.5,
    });
  });

  it('opens on the custom label when the place has one, and saves a typed label', async () => {
    const { db, place } = await seeded({ title: 'Farmhouse' });
    await render(<EditPlaceScreen placeId={place.id} />);

    expect(await screen.findByRole('button', { name: 'Type your own label' })).toBeSelected();
    expect(screen.getByLabelText('Your label').props.value).toBe('Farmhouse');
    await fireEvent.changeText(screen.getByLabelText('Your label'), 'Guest house');
    await fireEvent.press(save());

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect((await getMemory(db, place.id))?.title).toBe('Guest house');
  });

  it('asks for a label when Custom is chosen and left empty, and saves nothing', async () => {
    const { db, place } = await seeded();
    await render(<EditPlaceScreen placeId={place.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Type your own label' }));
    await fireEvent.press(save());

    expect(await screen.findByText('Choose or type a label.')).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect((await getMemory(db, place.id))?.title).toBe('Home');
  });

  it('will not let a place with no pin lose its address (R4.10)', async () => {
    const { db, place } = await seeded({ lat: null, lng: null });
    await render(<EditPlaceScreen placeId={place.id} />);
    await fireEvent.changeText(await screen.findByLabelText('Address'), '  ');
    await fireEvent.press(save());

    expect(await screen.findByText('This place has no pin, so it needs an address.')).toBeTruthy();
    expect((await getMemory(db, place.id))?.address).toBe('House 22, Sample Street');
  });

  it('stops typing at the limits', async () => {
    const { place } = await seeded({ title: 'Farmhouse' });
    await render(<EditPlaceScreen placeId={place.id} />);
    expect((await screen.findByLabelText('Your label')).props.maxLength).toBe(40);
    expect(screen.getByLabelText('Address').props.maxLength).toBe(300);
    expect(screen.getByLabelText('Notes for next time').props.maxLength).toBe(2000);
  });

  it('closes without saving on Cancel', async () => {
    const { db, place } = await seeded();
    await render(<EditPlaceScreen placeId={place.id} />);
    await fireEvent.changeText(await screen.findByLabelText('Address'), 'Somewhere else');
    await fireEvent.press(screen.getByRole('button', { name: 'Close without saving' }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect((await getMemory(db, place.id))?.address).toBe('House 22, Sample Street');
  });

  it('says so and stays open when the changes cannot be saved', async () => {
    const { db, place } = await seeded();
    await render(<EditPlaceScreen placeId={place.id} />);
    await screen.findByLabelText('Address');
    // The place is deleted elsewhere while the form is open.
    await softDeleteMemory(db, place.id);
    await fireEvent.press(save());

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('The changes could not be saved. Try again.'),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows "not found" for a malformed, unknown, or deleted id, and for a note', async () => {
    const { db, place } = await seeded();
    const note = await createNote(db, { title: 'Note', notes: 'Note' });
    await softDeleteMemory(db, place.id);
    for (const id of [null, '3f2504e0-4f89-41d3-9a0c-0305e82c3301', note.id, place.id]) {
      const { unmount } = await render(<EditPlaceScreen placeId={id} />);
      expect(await screen.findByText('This place is no longer in MindPin.')).toBeTruthy();
      await unmount();
    }
  });
});
