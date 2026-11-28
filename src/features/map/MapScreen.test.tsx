// T064: the map of every saved pin (R6.3). The map is native, so tests use the stand-in from
// jest.setup.ts and check what it is asked to show.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { createPlace, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { MapScreen, regionFor } from './MapScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));
const mockFlags = { MAPS_AVAILABLE: true };
jest.mock('../../lib/buildFlags', () => ({
  get MAPS_AVAILABLE() {
    return mockFlags.MAPS_AVAILABLE;
  },
}));
let mockOnline = true;
jest.mock('../../lib/useOnline', () => ({ useOnline: () => mockOnline }));

async function seeded() {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person' });
  const shop = await createPlace(db, { personId: person.id, title: 'Shop', lat: 31.5, lng: 74.3 });
  await createPlace(db, { title: 'Office', lat: 31.7, lng: 74.5 });
  await createPlace(db, { title: 'No pin yet', address: 'Far Street' });
  const gone = await createPlace(db, { title: 'Gone', lat: 10, lng: 10 });
  await softDeleteMemory(db, gone.id);
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { shop };
}

describe('MapScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlags.MAPS_AVAILABLE = true;
    mockOnline = true;
  });

  it('shows a pin for every saved place that has a location (R6.3)', async () => {
    await seeded();
    await render(<MapScreen />);
    expect(await screen.findByText('2 pinned places')).toBeTruthy();
    const pins = screen.getAllByTestId('map-pin');
    expect(pins.map((pin) => pin.props.title).sort()).toEqual(['Office', 'Shop · Sample Person']);
    expect(screen.getByTestId('all-pins-map').props.initialRegion).toMatchObject({
      latitude: expect.closeTo(31.6, 5),
      longitude: expect.closeTo(74.4, 5),
    });
  });

  it('opens the place when the label of its pin is tapped', async () => {
    const { shop } = await seeded();
    await render(<MapScreen />);
    await screen.findByText('2 pinned places');
    const pin = screen.getAllByTestId('map-pin').find((entry) => entry.props.title.startsWith('Shop'));
    await fireEvent(pin!, 'calloutPress');
    expect(mockRouter.push).toHaveBeenCalledWith(`/place/${shop.id}`);
  });

  it('never asks for or shows where the user is (privacy rules)', async () => {
    await seeded();
    await render(<MapScreen />);
    await screen.findByText('2 pinned places');
    const map = screen.getByTestId('all-pins-map');
    expect(map.props.showsUserLocation).toBe(false);
    expect(map.props.showsMyLocationButton).toBe(false);
  });

  it('explains instead of drawing a map with no key, offline, or with no pins', async () => {
    await seeded();
    mockFlags.MAPS_AVAILABLE = false;
    const noKey = await render(<MapScreen />);
    expect(await screen.findByText(/not set up in this build/)).toBeTruthy();
    expect(screen.queryByTestId('all-pins-map')).toBeNull();
    await noKey.unmount();

    mockFlags.MAPS_AVAILABLE = true;
    mockOnline = false;
    const offline = await render(<MapScreen />);
    expect(await screen.findByText(/needs a connection/)).toBeTruthy();
    await offline.unmount();

    mockOnline = true;
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    await render(<MapScreen />);
    expect(await screen.findByText(/No pinned places yet/)).toBeTruthy();
  });

  it('keeps a single pin at street level rather than zooming all the way in', () => {
    expect(regionFor([{ id: 'a', label: 'A', lat: 1, lng: 2 }])).toEqual({
      latitude: 1,
      longitude: 2,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  });
});
