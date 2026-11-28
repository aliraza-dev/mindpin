// T053: the person screen (R3.10, R4.3, R4.7, R4.8, R10.8).
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Memory } from '../../db/memories';
import type { Person } from '../../db/people';
import { initI18n } from '../../i18n';
import { PersonView } from './PersonView';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 26, 12).getTime();

function memory(overrides: Partial<Memory>): Memory {
  return {
    id: 'm',
    type: 'place',
    personId: 'p1',
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
  };
}

const person: Person = {
  id: 'p1',
  name: 'Sample Person',
  phone: '+10000000000',
  contactRef: 'c-1',
  photoUri: null,
  color: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const places = [
  {
    place: memory({ id: 'shop', title: 'Shop', address: 'Main Road', createdAt: NOW - 2 * DAY }),
    lastVisitedAt: null,
  },
  {
    place: memory({ id: 'home', title: 'Home', address: 'Street 14', createdAt: NOW - 300 * DAY }),
    lastVisitedAt: NOW - 60 * DAY,
  },
];

const notes = [
  memory({
    id: 'n1',
    type: 'note',
    title: 'Things to bring',
    notes: 'Things to bring\nSweets, gift',
  }),
  memory({
    id: 'n2',
    type: 'note',
    title: 'Wi-Fi',
    notes: 'Wi-Fi\nNetwork name',
    updatedAt: new Date(2026, 8, 14, 9).getTime(),
  }),
];

function setup(overrides: Partial<Parameters<typeof PersonView>[0]> = {}) {
  const handlers = {
    onBack: jest.fn(),
    onEdit: jest.fn(),
    onCall: jest.fn(),
    onMessage: jest.fn(),
    onSharePlaces: jest.fn(),
    onAddPlace: jest.fn(),
    onOpenPlace: jest.fn(),
    onNewNote: jest.fn(),
    onOpenNote: jest.fn(),
    onEditPlace: jest.fn(),
    onDeletePlace: jest.fn(),
    onDeleteNote: jest.fn(),
  };
  const view = render(
    <PersonView
      person={person}
      places={places}
      notes={notes}
      now={NOW}
      {...handlers}
      {...overrides}
    />,
  );
  return { handlers, view };
}

describe('PersonView', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('shows who the person is', async () => {
    await setup().view;
    expect(screen.getByText('Sample Person')).toBeTruthy();
    expect(screen.getByText('+10000000000 · from contacts')).toBeTruthy();
  });

  it("lists all of the person's places with when each was last visited (R4.3)", async () => {
    await setup().view;
    expect(screen.getByText('Places · 2')).toBeTruthy();
    expect(screen.getByText('Shop')).toBeTruthy();
    expect(screen.getByText('Main Road')).toBeTruthy();
    expect(screen.getByText('Not visited yet · saved 2 days ago')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Last visited 2 months ago')).toBeTruthy();
  });

  it('opens a place when it is tapped', async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Open Home' }));
    expect(handlers.onOpenPlace).toHaveBeenCalledWith('home');
  });

  it('offers Call, Message, and Share places, each with a spoken label (R3.10, R4.8)', async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Call Sample Person' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Message Sample Person' }));
    await fireEvent.press(screen.getByRole('button', { name: "Share Sample Person's places" }));
    expect(handlers.onCall).toHaveBeenCalledTimes(1);
    expect(handlers.onMessage).toHaveBeenCalledTimes(1);
    expect(handlers.onSharePlaces).toHaveBeenCalledTimes(1);
  });

  it('offers Call and Message only when a phone number is saved (R3.10)', async () => {
    await setup({ person: { ...person, phone: null, contactRef: null } }).view;
    expect(screen.queryByRole('button', { name: 'Call Sample Person' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Message Sample Person' })).toBeNull();
    expect(screen.getByRole('button', { name: "Share Sample Person's places" })).toBeTruthy();
    expect(screen.queryByText(/from contacts/)).toBeNull();
  });

  it('offers to edit the person (R3.12)', async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Sample Person' }));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
  });

  it('offers Add place (R4.7) and goes back', async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Add a place for Sample Person' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(handlers.onAddPlace).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('lists the notes linked to the person, with date and preview (R10.8)', async () => {
    const { handlers, view } = setup();
    await view;
    expect(screen.getByText('Notes about Sample · 2')).toBeTruthy();
    expect(screen.getByText('Things to bring')).toBeTruthy();
    expect(screen.getByText('Today · Sweets, gift')).toBeTruthy();
    expect(screen.getByText('Sep 14 · Network name')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Open note Wi-Fi' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Write a new note about Sample Person' }),
    );
    expect(handlers.onOpenNote).toHaveBeenCalledWith('n2');
    expect(handlers.onNewNote).toHaveBeenCalledTimes(1);
  });

  it('says so when the person has no places, and still offers to add one', async () => {
    await setup({ places: [], notes: [] }).view;
    expect(screen.getByText('Places · 0')).toBeTruthy();
    expect(screen.getByText('No places saved for Sample yet.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a place for Sample Person' })).toBeTruthy();
    expect(screen.getByText('Notes about Sample · 0')).toBeTruthy();
  });
});
