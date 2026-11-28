// T053: the person screen loads its own data and hands off to other apps safely.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

import { getDatabase } from '../../db/database';
import { createNote, createPlace } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { initI18n } from '../../i18n';
import { callPerson, messagePerson } from '../links/externalLinks';
import { PersonScreen } from './PersonScreen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../links/externalLinks', () => ({ callPerson: jest.fn(), messagePerson: jest.fn() }));

async function seeded() {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person', phone: '+1 000 000-0000' });
  const place = await createPlace(db, {
    personId: person.id,
    title: 'Home',
    address: 'Street 14',
    lat: 1.5,
    lng: 2.5,
    notes: 'Gate code 4471',
  });
  const note = await createNote(db, {
    title: 'Wi-Fi',
    notes: 'Wi-Fi\nNetwork name',
    personId: person.id,
  });
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, person, place, note };
}

describe('PersonScreen', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('loads the person with their places and notes from the database', async () => {
    const { person } = await seeded();
    await render(<PersonScreen personId={person.id} />);
    expect(await screen.findByText('Sample Person')).toBeTruthy();
    expect(screen.getByText('Places · 1')).toBeTruthy();
    expect(screen.getByText('Street 14')).toBeTruthy();
    expect(screen.getByText('Notes about Sample · 1')).toBeTruthy();
  });

  it('shows "not found" for an id that is malformed or unknown, without failing', async () => {
    await seeded();
    const { unmount } = await render(<PersonScreen personId={null} />);
    expect(await screen.findByText('This person is no longer in MindPin.')).toBeTruthy();
    await unmount();
    await render(<PersonScreen personId="3f2504e0-4f89-41d3-9a0c-0305e82c3301" />);
    expect(await screen.findByText('This person is no longer in MindPin.')).toBeTruthy();
  });

  it('hands Call and Message to the dialer and messaging app, and says so if none opens', async () => {
    const { person } = await seeded();
    (callPerson as jest.Mock).mockResolvedValue(true);
    (messagePerson as jest.Mock).mockResolvedValue(null);
    await render(<PersonScreen personId={person.id} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Call Sample Person' }));
    expect(callPerson).toHaveBeenCalledWith('+1 000 000-0000');
    expect(Alert.alert).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Message Sample Person' }));
    expect(messagePerson).toHaveBeenCalledWith('+1 000 000-0000');
    expect(Alert.alert).toHaveBeenCalledWith('No app on this phone can send the message.');
  });

  it("shares the person's places without their notes (R4.8)", async () => {
    const { person } = await seeded();
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<PersonScreen personId={person.id} />);
    await fireEvent.press(
      await screen.findByRole('button', { name: "Share Sample Person's places" }),
    );

    const message = share.mock.calls[0][0].message as string;
    expect(message).toContain('Home\nStreet 14\nhttps://www.google.com/maps/search/');
    expect(message).not.toContain('4471');
  });

  it('opens the edit form for the person (R3.12)', async () => {
    const { person } = await seeded();
    await render(<PersonScreen personId={person.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Edit Sample Person' }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/person/${person.id}/edit`);
  });

  it('opens places, notes, and the add screens', async () => {
    const { person, place, note } = await seeded();
    await render(<PersonScreen personId={person.id} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Open Home' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Open note Wi-Fi' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/place/${place.id}`);
    expect(mockRouter.push).toHaveBeenCalledWith(`/note/${note.id}`);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
