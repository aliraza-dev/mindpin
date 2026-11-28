// T068, T077: a note is stored as it is typed, with no row before the first keystroke
// (R10.1 to R10.3), and can be linked (R10.8).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { createNote, createPlace, listNotes } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { NoteScreen } from './NoteScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

const first = () => screen.findByLabelText('Note title, line 1');
const none = { noteId: null, validId: true, personId: null, placeId: null };

describe('NoteScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => jest.clearAllMocks());

  it('creates the note on the first keystroke and keeps saving as the user types', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<NoteScreen {...none} />);
    const input = await first();
    expect(await listNotes(db)).toHaveLength(0);

    await fireEvent.changeText(input, 'Eid plans');
    await waitFor(async () => expect(await listNotes(db)).toHaveLength(1));
    await fireEvent.changeText(await first(), 'Eid plans\nBring sweets');
    await waitFor(async () =>
      expect((await listNotes(db))[0]).toMatchObject({
        title: 'Eid plans',
        notes: 'Eid plans\nBring sweets',
      }),
    );
    expect(await listNotes(db)).toHaveLength(1);
  });

  it('starts a note from a person screen already linked to that person', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Sample Person' });
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<NoteScreen {...none} personId={person.id} />);
    await fireEvent.changeText(await first(), 'Likes tea');
    await waitFor(async () => expect((await listNotes(db))[0]?.personId).toBe(person.id));
  });

  it('opens an existing note and stores edits to it', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Gate', notes: 'Gate\n4471' });
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<NoteScreen {...none} noteId={note.id} />);
    await fireEvent.changeText(await screen.findByLabelText('Line 2'), '9912');
    await waitFor(async () => expect((await listNotes(db))[0].notes).toBe('Gate\n9912'));
  });

  it('does not keep a note that was left empty', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<NoteScreen {...none} />);
    await fireEvent.changeText(await first(), 'x');
    await waitFor(async () => expect(await listNotes(db)).toHaveLength(1));
    await fireEvent.changeText(await first(), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    const rows = await db.getAllAsync("SELECT id FROM memory WHERE type = 'note'");
    expect(rows).toHaveLength(0);
  });

  it('links the note to a person and a place from the editor (R10.8)', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Sample Person' });
    const place = await createPlace(db, { title: 'Shop', address: 'Main Road' });
    const note = await createNote(db, { title: 'Gate', notes: 'Gate' });
    (getDatabase as jest.Mock).mockResolvedValue(db);
    await render(<NoteScreen {...none} noteId={note.id} />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Link this note to a person or place' }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Link to Sample Person' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Link to Shop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save the links and close' }));
    await waitFor(async () =>
      expect((await listNotes(db))[0]).toMatchObject({ personId: person.id, placeId: place.id }),
    );
  });

  it('says so when the note is gone or the address is malformed', async () => {
    (getDatabase as jest.Mock).mockResolvedValue(await freshDb());
    const view = await render(
      <NoteScreen {...none} noteId="0b0f6f0e-0000-4000-8000-000000000000" />,
    );
    expect(await screen.findByText('This note is no longer in MindPin.')).toBeTruthy();
    await view.unmount();
    await render(<NoteScreen {...none} validId={false} />);
    expect(await screen.findByText('This note is no longer in MindPin.')).toBeTruthy();
  });
});
