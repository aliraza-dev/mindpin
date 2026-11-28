// T063: adding a place by hand opens the same save sheet (R4.7).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { createPerson } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { AddPlaceScreen } from './AddPlaceScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../save/lookups', () => ({
  deviceLookups: {
    resolveLink: jest.fn().mockResolvedValue({ kind: 'retry' }),
    geocoder: {
      addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Main Boulevard' }),
      coordinatesFor: jest.fn().mockResolvedValue({ kind: 'retry' }),
    },
  },
}));
jest.mock('../people/contacts', () => ({
  deviceContacts: {
    getAccess: jest.fn().mockResolvedValue('denied'),
    requestAccess: jest.fn(),
    loadContacts: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('../../lib/buildFlags', () => ({ MAPS_AVAILABLE: false }));
jest.mock('../../lib/useOnline', () => ({ useOnline: () => true }));

const next = () => screen.getByRole('button', { name: 'Continue to save this place' });

describe('AddPlaceScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => jest.clearAllMocks());

  it('asks for a link or an address before going on', async () => {
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    await render(<AddPlaceScreen personId={null} />);
    await fireEvent.press(next());
    expect(screen.getByText('Paste a link or type an address first.')).toBeTruthy();
    expect(screen.queryByText('Save this place')).toBeNull();
  });

  it('saves a typed address for the person it was opened from', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Ahmed Sample' });
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<AddPlaceScreen personId={person.id} />);
    await fireEvent.changeText(
      screen.getByLabelText('Maps link or address'),
      ' House 22, Sample Street ',
    );
    await fireEvent.press(next());

    expect(await screen.findByText('Address from the text')).toBeTruthy();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Save this place to Ahmed Sample' }),
    );
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect((await listPlaceSummaries(db))[0]).toMatchObject({
      personName: 'Ahmed Sample',
      place: { address: 'House 22, Sample Street', title: 'Home', status: 'pending_geocode' },
    });
  });

  it('reads the pin from a pasted maps link', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<AddPlaceScreen personId={null} />);
    await fireEvent.changeText(
      screen.getByLabelText('Maps link or address'),
      'https://maps.google.com/?q=31.5204,74.3587',
    );
    await fireEvent.press(next());

    expect(await screen.findByText('Main Boulevard')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save this place' }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect((await listPlaceSummaries(db))[0].place).toMatchObject({ lat: 31.5204, lng: 74.3587 });
  });
});
