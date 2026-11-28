// T069: the Notes list (R10.6, R10.7, R10.11). The sideways drag itself needs a real phone;
// these tests check the actions it uncovers and the press-and-hold menu.
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Memory } from '../../db/memories';
import { initI18n } from '../../i18n';
import { NotesList } from './NotesList';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 26, 19).getTime();

const note = (id: string, body: string, overrides: Partial<Memory> = {}): Memory => ({
  id,
  type: 'note',
  personId: null,
  placeId: null,
  title: body.split('\n')[0],
  lat: null,
  lng: null,
  address: null,
  notes: body,
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

const notes = [
  note('a', 'Eid plans\nBring sweets'),
  note('b', 'Gate codes\n4471', { pinned: true, updatedAt: NOW - 3 * DAY }),
  note('c', 'Old list', { updatedAt: NOW - 3 * DAY }),
];

function setup(list = notes) {
  const handlers = { onOpen: jest.fn(), onNew: jest.fn(), onBack: jest.fn(), onAction: jest.fn() };
  const view = render(<NotesList notes={list} now={NOW} {...handlers} />);
  return { view, handlers };
}

describe('NotesList', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('shows pinned notes first, then sections by last edit (R10.6, R10.7)', async () => {
    await setup().view;
    const headings = screen.getAllByRole('header').map((heading) => heading.props.children);
    expect(headings).toEqual(['Notes', 'Pinned', 'Today', 'Previous 7 days']);
    expect(screen.getByText(/Bring sweets/)).toBeTruthy();
  });

  it('opens a note, starts a new one, and goes back', async () => {
    const { view, handlers } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Open note Eid plans' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Write a new note' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(handlers.onOpen).toHaveBeenCalledWith('a');
    expect(handlers.onNew).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('offers pin, link, and delete behind each note for the swipe (R10.11)', async () => {
    const { view, handlers } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Pin note Eid plans' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Link note Eid plans to a person or place' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete note Eid plans' }));
    expect(handlers.onAction.mock.calls.map(([action, target]) => [action, target.id])).toEqual([
      ['pin', 'a'],
      ['link', 'a'],
      ['delete', 'a'],
    ]);
    expect(screen.getByRole('button', { name: 'Unpin note Gate codes' })).toBeTruthy();
  });

  it('offers the same three actions on press and hold (R10.11)', async () => {
    const { view, handlers } = setup();
    await view;
    await fireEvent(screen.getByRole('button', { name: 'Open note Gate codes' }), 'longPress');
    expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
      'Unpin',
      'Link',
      'Delete',
    ]);
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(handlers.onAction).toHaveBeenCalledWith('delete', expect.objectContaining({ id: 'b' }));
  });

  it('says so when there are no notes', async () => {
    await setup([]).view;
    expect(screen.getByText('No notes yet. Tap New note to write one.')).toBeTruthy();
  });

  it('draws 30 notes at first and more as the list is scrolled towards its end (R10.6)', async () => {
    const many = Array.from({ length: 70 }, (_, index) =>
      note(`n${index}`, `Note ${index}`, { updatedAt: NOW - index * 60_000 }),
    );
    await setup(many).view;
    const drawn = () => screen.getAllByRole('button', { name: /^Open / }).length;
    expect(drawn()).toBe(30);
    const scroll = (y: number) =>
      fireEvent.scroll(screen.getByTestId('notes-scroll'), {
        nativeEvent: {
          contentOffset: { y },
          layoutMeasurement: { height: 700 },
          contentSize: { height: 2200 },
        },
      });
    // Far from the end, nothing more is drawn.
    await scroll(100);
    expect(drawn()).toBe(30);
    await scroll(1400);
    expect(drawn()).toBe(60);
    await scroll(1400);
    expect(drawn()).toBe(70);
  });

  it('has a note mark before its title (R10.6)', async () => {
    await setup().view;
    expect(screen.getByTestId('notes-mark')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Notes' })).toBeTruthy();
  });
});
