// T054: the place screen loads its own data and performs Navigate, I'm here, and Share.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

import { getDatabase } from '../../db/database';
import { createNote, createPlace, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { listVisits } from '../../db/visits';
import { initI18n } from '../../i18n';
import { openInMaps } from '../links/externalLinks';
import { getNavigatePrompt } from '../visits/navigateConfirm';
import { PlaceScreen } from './PlaceScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../links/externalLinks', () => ({ openInMaps: jest.fn() }));

const MINUTE = 60_000;

async function seeded() {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person' });
  const place = await createPlace(db, {
    personId: person.id,
    title: 'Home',
    address: 'House 22, Sample Street',
    lat: 1.5,
    lng: 2.5,
    notes: 'White gate',
    tags: ['Gate code 4471'],
  });
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, person, place };
}

describe('PlaceScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('loads the place, its person, and its visits from the database', async () => {
    const { place } = await seeded();
    await render(<PlaceScreen placeId={place.id} />);
    expect(await screen.findByRole('header', { name: 'Home' })).toBeTruthy();
    expect(screen.getByText('Sample Person')).toBeTruthy();
    expect(screen.getByText('House 22, Sample Street')).toBeTruthy();
    expect(screen.getByText('0 total')).toBeTruthy();
  });

  it('shows "not found" for a malformed, unknown, or deleted id, and for a note', async () => {
    const { db, place } = await seeded();
    const note = await createNote(db, { title: 'Note', notes: 'Note' });
    await softDeleteMemory(db, place.id);
    for (const id of [null, '3f2504e0-4f89-41d3-9a0c-0305e82c3301', note.id, place.id]) {
      const { unmount } = await render(<PlaceScreen placeId={id} />);
      expect(await screen.findByText('This place is no longer in MindPin.')).toBeTruthy();
      await unmount();
    }
  });

  it('opens the maps app and remembers it, to ask later whether the visit happened (R4.5, R5.2)', async () => {
    const { db, place } = await seeded();
    (openInMaps as jest.Mock).mockResolvedValue(true);
    await render(<PlaceScreen placeId={place.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Open Home in your maps app' }));

    await waitFor(async () =>
      expect(await getNavigatePrompt(db, Date.now() + 16 * MINUTE)).toMatchObject({
        place: { id: place.id },
      }),
    );
    expect((openInMaps as jest.Mock).mock.calls[0][0]).toMatchObject({ id: place.id, lat: 1.5, lng: 2.5 });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('says so, and remembers nothing, when no maps app opens', async () => {
    const { db, place } = await seeded();
    (openInMaps as jest.Mock).mockResolvedValue(false);
    await render(<PlaceScreen placeId={place.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Open Home in your maps app' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('No maps app could open this place.'),
    );
    expect(await getNavigatePrompt(db, Date.now() + 16 * MINUTE)).toBeNull();
  });

  it('records a visit now and shows it (R5.1)', async () => {
    const { db, place } = await seeded();
    await render(<PlaceScreen placeId={place.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Record a visit to Home now' }));

    expect(await screen.findByText('1 total')).toBeTruthy();
    expect(await listVisits(db, place.id)).toMatchObject([{ source: 'manual', note: null }]);
  });

  it('shares the address and a maps link, never the notes or tags (R4.6)', async () => {
    const { place } = await seeded();
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<PlaceScreen placeId={place.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Share Home' }));

    const message = share.mock.calls[0][0].message as string;
    expect(message).toBe(
      'House 22, Sample Street\nhttps://www.google.com/maps/search/?api=1&query=1.5%2C2.5',
    );
    expect(message).not.toContain('4471');
  });
});
