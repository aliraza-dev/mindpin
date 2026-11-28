// T078, T079, T080: the Notes screen pins, links, and deletes with Undo (R10.6, R10.8, R10.10).
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { createNote, getMemory, listNotes } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { NotesScreen } from './NotesScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

async function seeded() {
  const db = await freshDb();
  const note = await createNote(db, { title: 'Eid plans', notes: 'Eid plans\nBring sweets' });
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, note };
}

const remove = () => screen.findByRole('button', { name: 'Delete note Eid plans' });
const undo = { name: 'Bring the deleted note back' };

describe('NotesScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.useRealTimers());

  it('opens a note and a new note', async () => {
    const { note } = await seeded();
    await render(<NotesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Open note Eid plans' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Write a new note' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/note/[id]', params: { id: note.id } });
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/note/[id]', params: { id: 'new' } });
  });

  it('pins a note (R10.6)', async () => {
    const { db } = await seeded();
    await render(<NotesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Pin note Eid plans' }));
    expect(await screen.findByRole('button', { name: 'Unpin note Eid plans' })).toBeTruthy();
    expect((await listNotes(db))[0].pinned).toBe(true);
  });

  it('removes a deleted note at once and brings it back unchanged on Undo (R10.10)', async () => {
    const { db, note } = await seeded();
    await render(<NotesScreen />);
    await fireEvent.press(await remove());
    expect(await screen.findByText('Note deleted')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Open note Eid plans' })).toBeNull());

    await fireEvent.press(screen.getByRole('button', undo));
    expect(await screen.findByRole('button', { name: 'Open note Eid plans' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', undo)).toBeNull());
    expect(await getMemory(db, note.id)).toMatchObject({ deletedAt: null, updatedAt: note.updatedAt });
  });

  it('removes the note for good when the 5 seconds pass (R10.10)', async () => {
    const { db, note } = await seeded();
    await render(<NotesScreen />);
    const button = await remove();
    jest.useFakeTimers();
    await fireEvent.press(button);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole('button', undo)).toBeTruthy();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    jest.useRealTimers();
    await waitFor(() => expect(screen.queryByRole('button', undo)).toBeNull());
    expect(await getMemory(db, note.id)).toBeNull();
  });

  it('removes the note for good when the user leaves the screen (R10.10)', async () => {
    const { db, note } = await seeded();
    const view = await render(<NotesScreen />);
    await fireEvent.press(await remove());
    await screen.findByRole('button', undo);
    await view.unmount();
    await waitFor(async () => expect(await getMemory(db, note.id)).toBeNull());
  });

  it('links a note to a person (R10.8)', async () => {
    const { db } = await seeded();
    const person = await createPerson(db, { name: 'Sample Person' });
    await render(<NotesScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Link note Eid plans to a person or place' }),
    );
    await fireEvent.press(await screen.findByRole('radio', { name: 'Link to Sample Person' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save the links and close' }));
    await waitFor(async () => expect((await listNotes(db))[0].personId).toBe(person.id));
  });
});
