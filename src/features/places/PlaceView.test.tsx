// T054: the place screen (R4.2, R4.5, R4.6, R5.1, R5.3, R5.4, R10.8).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Memory } from '../../db/memories';
import type { Visit } from '../../db/visits';
import { initI18n } from '../../i18n';
import { tokens } from '../../ui/tokens';
import { isCodeTag, PlaceView } from './PlaceView';

// The map is hidden from screen readers, so tests must ask for hidden elements to see it.
const MAP = { includeHiddenElements: true };

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 26, 12).getTime();
const on = (month: number, day: number) => new Date(2026, month - 1, day, 12).getTime();

const place: Memory = {
  id: 'home',
  type: 'place',
  personId: 'p1',
  placeId: null,
  title: 'Home',
  lat: 31.5,
  lng: 74.3,
  address: 'House 22, Sample Street',
  notes: 'White gate opposite the park.',
  tags: ['Gate code 4471', '2nd floor'],
  pinned: false,
  sourceApp: null,
  sourceRaw: null,
  status: 'resolved',
  payload: null,
  createdAt: on(2, 20),
  updatedAt: on(2, 20),
  deletedAt: null,
};

const visits: Visit[] = [
  { id: 'v2', memoryId: 'home', visitedAt: on(9, 14), note: 'Eid dinner', source: 'manual' },
  { id: 'v1', memoryId: 'home', visitedAt: on(6, 2), note: null, source: 'navigate_confirm' },
];

const linkedNote: Memory = {
  ...place,
  id: 'n1',
  type: 'note',
  title: 'Wi-Fi',
  notes: 'Wi-Fi\nNetwork name',
  tags: [],
  updatedAt: NOW - 3 * DAY,
};

function setup(overrides: Partial<Parameters<typeof PlaceView>[0]> = {}) {
  const handlers = {
    onBack: jest.fn(),
    onOpenMenu: jest.fn(),
    onNavigate: jest.fn(),
    onImHere: jest.fn(),
    onShare: jest.fn(),
    onOpenNote: jest.fn(),
  };
  const view = render(
    <PlaceView
      place={place}
      personName="Sample Person"
      visits={visits}
      linkedNotes={[linkedNote]}
      now={NOW}
      showMap={false}
      {...handlers}
      {...overrides}
    />,
  );
  return { handlers, view };
}

describe('isCodeTag', () => {
  it('picks out tags that carry a code, in any language', () => {
    expect(isCodeTag('Gate code 4471')).toBe(true);
    expect(isCodeTag('کوڈ 1234')).toBe(true);
    expect(isCodeTag('2nd floor')).toBe(false);
    expect(isCodeTag('Park outside')).toBe(false);
  });
});

describe('PlaceView', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('shows whose place it is, its label, and its address', async () => {
    await setup().view;
    expect(screen.getByText('Sample Person')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Home' })).toBeTruthy();
    expect(screen.getByText('House 22, Sample Street')).toBeTruthy();
  });

  it('shows the notes and quick tags, with code tags standing out (R4.2)', async () => {
    await setup().view;
    expect(screen.getByText('White gate opposite the park.')).toBeTruthy();
    const code = StyleSheet.flatten(screen.getByText('Gate code 4471').props.style);
    const plain = StyleSheet.flatten(screen.getByText('2nd floor').props.style);
    expect(code.color).toBe(tokens.color.amberTagText);
    expect(plain.color).toBe(tokens.color.text);
  });

  it('offers Navigate, I\'m here, and Share, each with a spoken label (R4.5, R4.6, R5.1)', async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Open Home in your maps app' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Record a visit to Home now' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Share Home' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(handlers.onNavigate).toHaveBeenCalledTimes(1);
    expect(handlers.onImHere).toHaveBeenCalledTimes(1);
    expect(handlers.onShare).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('lists past visits newest first, with notes and how long ago (R5.3, R5.4)', async () => {
    await setup().view;
    expect(screen.getByText('2 total')).toBeTruthy();
    const rows = screen.getAllByTestId('visit-row').map((row) => row.props.accessibilityLabel);
    expect(rows).toEqual([
      'Sep 14 · Eid dinner, 2 months ago',
      'Jun 2, 5 months ago',
      'Feb 20 · first saved, 9 months ago',
    ]);
  });

  it('shows only the day it was saved when there are no visits yet', async () => {
    await setup({ visits: [] }).view;
    expect(screen.getByText('0 total')).toBeTruthy();
    expect(screen.getAllByTestId('visit-row')).toHaveLength(1);
  });

  it('lists the notes linked to the place (R10.8)', async () => {
    const { handlers, view } = setup();
    await view;
    expect(screen.getByText('Notes about this place · 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open note Wi-Fi' }));
    expect(handlers.onOpenNote).toHaveBeenCalledWith('n1');
  });

  it('offers more options, where Edit and Delete are (R4.4)', async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'More options for Home' }));
    expect(handlers.onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('shows the map with the pin when told it can', async () => {
    await setup({ showMap: true }).view;
    expect(screen.getByTestId('place-map', MAP).props.region).toMatchObject({
      latitude: 31.5,
      longitude: 74.3,
    });
    expect(screen.getAllByTestId('map-pin', MAP)).toHaveLength(1);
  });

  it('shows no map when told it cannot, or when the place has no pin', async () => {
    const first = await setup({ showMap: false }).view;
    expect(screen.queryByTestId('place-map', MAP)).toBeNull();
    await first.unmount();
    await setup({ showMap: true, place: { ...place, lat: null, lng: null } }).view;
    expect(screen.queryByTestId('place-map', MAP)).toBeNull();
    expect(screen.getByText('House 22, Sample Street')).toBeTruthy();
  });

  it('leaves out what a place does not have', async () => {
    await setup({
      place: { ...place, personId: null, address: null, notes: null, tags: [] },
      personName: null,
      linkedNotes: [],
    }).view;
    expect(screen.queryByText('Sample Person')).toBeNull();
    expect(screen.queryByText('Notes')).toBeNull();
    expect(screen.queryByText(/Notes about this place/)).toBeNull();
    expect(screen.getByRole('header', { name: 'Home' })).toBeTruthy();
  });
});
