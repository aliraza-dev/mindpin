// T052: the home screen (R5.5, R6.1, R6.2, R6.3, R6.5, R7.8).
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Memory } from '../../db/memories';
import type { Person } from '../../db/people';
import type { PlaceSummary } from '../../db/placeSummaries';
import { initI18n } from '../../i18n';
import { summarizePeople } from './homeRows';
import { HomeView } from './HomeView';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 26, 19).getTime();

const person = (id: string, name: string): Person => ({
  id,
  name,
  phone: null,
  contactRef: null,
  photoUri: null,
  createdAt: 0,
  updatedAt: 0,
});

const memory = (overrides: Partial<Memory>): Memory => ({
  id: 'm',
  type: 'place',
  personId: null,
  placeId: null,
  title: '',
  lat: null,
  lng: null,
  address: null,
  notes: null,
  tags: [],
  pinned: false,
  sourceApp: null,
  sourceRaw: null,
  status: 'resolved',
  payload: null,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
  ...overrides,
});

const places: PlaceSummary[] = [
  {
    place: memory({
      id: 'shop',
      personId: 'a',
      title: 'Shop',
      address: 'Main Road',
      createdAt: NOW - 2 * DAY,
    }),
    personName: 'Ahmed Raza',
    lastVisitedAt: null,
  },
  {
    place: memory({
      id: 'home',
      personId: 'a',
      title: 'Home',
      address: 'Street 14',
      createdAt: NOW - 300 * DAY,
    }),
    personName: 'Ahmed Raza',
    lastVisitedAt: NOW - 60 * DAY,
  },
  {
    place: memory({ id: 'office', personId: 's', title: 'Office', createdAt: NOW - 200 * DAY }),
    personName: 'Sara Malik',
    lastVisitedAt: NOW - 21 * DAY,
  },
];
const people = summarizePeople([person('a', 'Ahmed Raza'), person('s', 'Sara Malik')], places);

const stalePlace = (id: string, title: string, lastVisitedAt: number | null) => ({
  place: memory({ id, title, createdAt: NOW - 240 * DAY }),
  personName: null,
  lastVisitedAt,
});

function setup(overrides: Partial<Parameters<typeof HomeView>[0]> = {}) {
  const handlers = {
    onSearchChange: jest.fn(),
    onChangeView: jest.fn(),
    onOpenNotes: jest.fn(),
    onOpenPerson: jest.fn(),
    onOpenPlace: jest.fn(),
    onOpenNote: jest.fn(),
    onToggleTheme: jest.fn(),
    onEditPerson: jest.fn(),
    onDeletePerson: jest.fn(),
    onEditPlace: jest.fn(),
    onDeletePlace: jest.fn(),
  };
  const view = render(
    <HomeView
      greeting="evening"
      firstName="Bilal"
      view="people"
      scheme="light"
      people={people}
      places={places}
      stale={[]}
      searchText=""
      results={null}
      now={NOW}
      {...handlers}
      {...overrides}
    />,
  );
  return { handlers, view };
}

describe('HomeView', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('greets the user by first name, or without a name when none was given (R7.8)', async () => {
    const first = setup();
    await first.view;
    expect(screen.getByText('Good evening, Bilal')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'MindPin' })).toBeTruthy();
    await (await first.view).unmount();

    await setup({ firstName: null, greeting: 'morning' }).view;
    expect(screen.getByText('Good morning')).toBeTruthy();
  });

  it('has a plain search bar: no microphone and no Ask MindPin (R6.5)', async () => {
    const { handlers, view } = setup();
    await view;
    expect(screen.queryByText(/ask/i)).toBeNull();
    expect(screen.queryByLabelText(/voice|microphone|ask/i)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Search everything you saved'), 'gul');
    expect(handlers.onSearchChange).toHaveBeenCalledWith('gul');
  });

  it('lists people with their places and the latest thing that happened (R6.3)', async () => {
    const { handlers, view } = setup();
    await view;
    expect(screen.getByText('Recently saved')).toBeTruthy();
    expect(screen.getByText('Home · Shop — saved 2 days ago')).toBeTruthy();
    expect(screen.getByText('2\nplaces')).toBeTruthy();
    expect(screen.getByText('Office — visited 3 weeks ago')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Sara Malik' }));
    expect(handlers.onOpenPerson).toHaveBeenCalledWith('s');
  });

  it('offers People, Places, and Notes (R6.3)', async () => {
    const { handlers, view } = setup();
    await view;
    expect(
      screen.getByRole('button', { name: 'Show people' }).props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Show places' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Open notes' }));
    expect(handlers.onChangeView).toHaveBeenCalledWith('places');
    expect(handlers.onOpenNotes).toHaveBeenCalledTimes(1);
  });

  it('lists places with whose they are and when they were last visited', async () => {
    const { handlers, view } = setup({ view: 'places' });
    await view;
    expect(screen.getByText('Ahmed Raza · Main Road')).toBeTruthy();
    expect(screen.getByText('Not visited yet')).toBeTruthy();
    expect(screen.getByText('Last visited 2 months ago')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Shop' }));
    expect(handlers.onOpenPlace).toHaveBeenCalledWith('shop');
  });

  it('shows up to 3 places not visited in over 6 months (R5.5)', async () => {
    const { handlers, view } = setup({
      stale: [
        stalePlace('nani', "Nani's house", NOW - 7 * 30 * DAY),
        stalePlace('old', 'Old office', null),
        stalePlace('c', 'Clinic', NOW - 400 * DAY),
        stalePlace('d', 'Fourth', NOW - 400 * DAY),
      ],
    });
    await view;
    expect(screen.getByText('Last visited 7 months ago')).toBeTruthy();
    expect(screen.getByText('Saved 8 months ago, not visited yet')).toBeTruthy();
    expect(screen.getAllByText('Plan a visit')).toHaveLength(3);
    await fireEvent.press(
      screen.getByRole('button', { name: "Open Nani's house to plan a visit" }),
    );
    expect(handlers.onOpenPlace).toHaveBeenCalledWith('nani');
  });

  it('shows search results in place of the lists while searching (R6.1, R6.2)', async () => {
    const { handlers, view } = setup({
      searchText: 'main',
      results: [
        { memory: places[0].place, personName: 'Ahmed Raza' },
        {
          memory: memory({
            id: 'n1',
            type: 'note',
            title: 'Main gate',
            notes: 'Main gate\nCode on the left',
          }),
          personName: null,
        },
      ],
    });
    await view;
    expect(screen.getByText('Results')).toBeTruthy();
    expect(screen.queryByText('Recently saved')).toBeNull();
    expect(screen.getByText('Code on the left')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Shop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Open note Main gate' }));
    expect(handlers.onOpenPlace).toHaveBeenCalledWith('shop');
    expect(handlers.onOpenNote).toHaveBeenCalledWith('n1');
  });

  it('says so when nothing matches, or when nothing is saved yet', async () => {
    const first = setup({ searchText: 'zzz', results: [] });
    await first.view;
    expect(screen.getByText('Nothing matches "zzz".')).toBeTruthy();
    await (await first.view).unmount();

    await setup({ people: [], places: [] }).view;
    expect(screen.getByText(/Nothing saved yet/)).toBeTruthy();
  });

  it('shows the pin mark before the app name', async () => {
    await setup().view;
    expect(screen.getByTestId('logo-mark', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'MindPin' })).toBeTruthy();
  });

  it('has a quick switch to the other theme (R11.6)', async () => {
    const light = setup();
    await light.view;
    await fireEvent.press(screen.getByRole('button', { name: 'Switch to the dark theme' }));
    expect(light.handlers.onToggleTheme).toHaveBeenCalledTimes(1);
    await (await light.view).unmount();

    await setup({ scheme: 'dark' }).view;
    expect(screen.getByRole('button', { name: 'Switch to the light theme' })).toBeTruthy();
  });

  it('offers Edit and Delete behind each person and place for the swipe', async () => {
    const inPeople = setup();
    await inPeople.view;
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Ahmed Raza' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Ahmed Raza' }));
    expect(inPeople.handlers.onEditPerson).toHaveBeenCalledWith('a');
    expect(inPeople.handlers.onDeletePerson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
    );
    await (await inPeople.view).unmount();

    const inPlaces = setup({ view: 'places' });
    await inPlaces.view;
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Shop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Shop' }));
    expect(inPlaces.handlers.onEditPlace).toHaveBeenCalledWith('shop');
    expect(inPlaces.handlers.onDeletePlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shop' }),
    );
  });

  it('shows a picture of people when the People view is empty, and a pin for Places', async () => {
    const HIDDEN = { includeHiddenElements: true };
    const noPeople = setup({ people: [] });
    await noPeople.view;
    expect(screen.getByTestId('empty-people', HIDDEN)).toBeTruthy();
    expect(
      screen.getByText('No people yet. Save a place for someone and they appear here.'),
    ).toBeTruthy();
    await (await noPeople.view).unmount();

    const noPlaces = setup({ view: 'places', places: [] });
    await noPlaces.view;
    expect(screen.getByTestId('empty-places', HIDDEN)).toBeTruthy();
    expect(screen.getByText('No places yet. Tap + to add one.')).toBeTruthy();
    await (await noPlaces.view).unmount();

    await setup({ people: [], places: [] }).view;
    expect(screen.getByTestId('empty-people', HIDDEN)).toBeTruthy();
    expect(screen.getByText(/Nothing saved yet/)).toBeTruthy();
  });
});
