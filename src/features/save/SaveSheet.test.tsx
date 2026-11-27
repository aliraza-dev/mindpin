// T034: the save sheet (R1.3, R1.4, R1.5, R2.3, R3.5, R3.11, R4.1, R4.2).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { getDatabase } from '../../db/database';
import { createPlace, getMemory, listNotes } from '../../db/memories';
import { createPerson, listPeople } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { freshDb } from '../../db/testing/freshDb';
import type { SqlDatabase } from '../../db/types';
import { initI18n } from '../../i18n';
import { deviceContacts } from '../people/contacts';
import { deviceLookups } from './lookups';
import { SaveSheet } from './SaveSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));
// The sheet must never reach the network or the address book in a test.
jest.mock('./lookups', () => ({
  deviceLookups: {
    resolveLink: jest.fn(),
    geocoder: { addressFor: jest.fn(), coordinatesFor: jest.fn() },
  },
}));
jest.mock('../people/contacts', () => ({
  deviceContacts: { getAccess: jest.fn(), requestAccess: jest.fn(), loadContacts: jest.fn() },
}));
const mockMaps = { available: true, online: true };
jest.mock('../../lib/buildFlags', () => ({
  get MAPS_AVAILABLE() {
    return mockMaps.available;
  },
}));
jest.mock('../../lib/useOnline', () => ({ useOnline: () => mockMaps.online }));

const MAP = { includeHiddenElements: true };
const PIN_LINK = 'Ahmed: new shop https://maps.google.com/?q=31.5204,74.3587';
const lookups = deviceLookups as unknown as {
  resolveLink: jest.Mock;
  geocoder: { addressFor: jest.Mock; coordinatesFor: jest.Mock };
};
const contactsMock = deviceContacts as unknown as {
  getAccess: jest.Mock;
  requestAccess: jest.Mock;
  loadContacts: jest.Mock;
};

async function open(sharedText: string, extra: Partial<Parameters<typeof SaveSheet>[0]> = {}) {
  const db = ((await (getDatabase as jest.Mock)()) as SqlDatabase | undefined) ?? (await freshDb());
  (getDatabase as jest.Mock).mockResolvedValue(db);
  const onClose = jest.fn();
  await render(<SaveSheet sharedText={sharedText} sourceApp="WhatsApp" onClose={onClose} {...extra} />);
  return { db, onClose };
}

const save = (name = 'Save this place') => screen.getByRole('button', { name });

describe('SaveSheet', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (getDatabase as jest.Mock).mockResolvedValue(undefined);
    mockMaps.available = true;
    mockMaps.online = true;
    lookups.resolveLink.mockResolvedValue({ kind: 'retry' });
    lookups.geocoder.addressFor.mockResolvedValue({ kind: 'found', value: 'Main Boulevard, Gulberg' });
    lookups.geocoder.coordinatesFor.mockResolvedValue({ kind: 'none' });
    contactsMock.getAccess.mockResolvedValue('denied');
    contactsMock.requestAccess.mockResolvedValue('denied');
    contactsMock.loadContacts.mockResolvedValue([]);
  });

  it('shows where the share came from, the address, how the pin was found, and a map preview (R2.3)', async () => {
    await open(PIN_LINK);
    expect(await screen.findByText('Main Boulevard, Gulberg')).toBeTruthy();
    expect(screen.getByText('Shared from WhatsApp')).toBeTruthy();
    expect(screen.getByText(PIN_LINK)).toBeTruthy();
    expect(screen.getByText('Pin found in Google Maps link')).toBeTruthy();
    expect(screen.getByTestId('place-map', MAP).props.region).toMatchObject({ latitude: 31.5204, longitude: 74.3587 });
  });

  it('shows a drawing in place of the map when the build has no maps key or the phone is offline', async () => {
    mockMaps.available = false;
    await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    expect(screen.queryByTestId('place-map', MAP)).toBeNull();
    expect(screen.getByTestId('map-drawing', MAP)).toBeTruthy();
  });

  it('saves with one tap, with no person and the label Home, then closes (R1.3, R3.11, R4.1)', async () => {
    const { db, onClose } = await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    expect(screen.getByRole('button', { name: 'Label this place Home' })).toBeSelected();
    await fireEvent.press(save());

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    const [summary] = await listPlaceSummaries(db);
    expect(summary.place).toMatchObject({
      title: 'Home',
      lat: 31.5204,
      lng: 74.3587,
      address: 'Main Boulevard, Gulberg',
      personId: null,
      sourceApp: 'WhatsApp',
      sourceRaw: PIN_LINK,
      status: 'resolved',
    });
  });

  it('saves a typed person, a custom label, notes, and tags (R3.4, R4.1, R4.2)', async () => {
    const { db, onClose } = await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    await fireEvent.changeText(screen.getByLabelText('Whose place is this?'), 'Sara Sample');
    await fireEvent.press(screen.getByRole('button', { name: 'Type your own label' }));
    await fireEvent.changeText(screen.getByLabelText('Your label'), 'Clinic');
    await fireEvent.changeText(screen.getByLabelText('Notes for next time'), 'Parking at the back');
    await fireEvent.changeText(screen.getByLabelText('Tags'), 'Gate code 4471, 2nd floor');
    await fireEvent.press(save('Save this place to Sara Sample'));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    const [summary] = await listPlaceSummaries(db);
    expect(summary.personName).toBe('Sara Sample');
    expect(summary.place).toMatchObject({
      title: 'Clinic',
      notes: 'Parking at the back',
      tags: ['Gate code 4471', '2nd floor'],
    });
  });

  it('does not wait for a slow lookup: the place is saved and finished later (R1.5)', async () => {
    lookups.geocoder.addressFor.mockResolvedValue({ kind: 'retry' });
    const { db, onClose } = await open(PIN_LINK);
    expect(await screen.findByText('The address will be added when you are online.')).toBeTruthy();
    await fireEvent.press(save());

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    expect((await listPlaceSummaries(db))[0].place).toMatchObject({ lat: 31.5204, address: null, status: 'pending_geocode' });
  });

  it('saves a short link while offline, to be opened later (R1.5)', async () => {
    const { db, onClose } = await open('https://maps.app.goo.gl/AbC123');
    expect(await screen.findByText('The link will be opened when you are online.')).toBeTruthy();
    await fireEvent.press(save());

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    expect((await listPlaceSummaries(db))[0].place).toMatchObject({ lat: null, status: 'pending_resolve' });
  });

  it('keeps an existing person and offers to update their place nearby (R3.5, R3.7)', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    const person = await createPerson(db, { name: 'Ahmed Sample' });
    const old = await createPlace(db, { personId: person.id, title: 'Shop', address: 'Old text', lat: 31.5205, lng: 74.3587 });
    const { onClose } = await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    await fireEvent.press(screen.getByRole('button', { name: 'Choose Ahmed Sample' }));

    expect(await screen.findByText(/Ahmed Sample already has Shop saved/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Update Shop instead of adding a new place' }));
    await fireEvent.press(save('Save this place to Ahmed Sample'));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    expect(await listPlaceSummaries(db)).toHaveLength(1);
    expect(await getMemory(db, old.id)).toMatchObject({ lat: 31.5204, address: 'Main Boulevard, Gulberg' });
    expect(await listPeople(db)).toHaveLength(1);
  });

  it('adds a second place when the offer to update is not taken', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    const person = await createPerson(db, { name: 'Ahmed Sample' });
    await createPlace(db, { personId: person.id, title: 'Shop', lat: 31.5205, lng: 74.3587 });
    const { onClose } = await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    await fireEvent.press(screen.getByRole('button', { name: 'Choose Ahmed Sample' }));
    await screen.findByText(/Ahmed Sample already has Shop saved/);
    await fireEvent.press(save('Save this place to Ahmed Sample'));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    expect(await listPlaceSummaries(db)).toHaveLength(2);
  });

  it('says when no location was found, and saves the text as a note (R1.4, R10.9)', async () => {
    const { db, onClose } = await open('See you on Friday');
    expect(await screen.findByText('No location was found in what you shared.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save this place' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Save the shared text as a note' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved_note'));
    expect(await listNotes(db)).toMatchObject([{ notes: 'See you on Friday', sourceApp: 'WhatsApp' }]);
    expect(await listPlaceSummaries(db)).toEqual([]);
  });

  it('lets the user enter an address when no location was found, keeping the shared text (R1.4)', async () => {
    const { db, onClose } = await open('https://example.com/invite');
    await fireEvent.press(await screen.findByRole('button', { name: 'Type the address of this place' }));
    await fireEvent.press(save());
    expect(await screen.findByText('This place has no pin, so it needs an address.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Address'), 'House 22, Sample Street');
    await fireEvent.press(save());
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    expect((await listPlaceSummaries(db))[0].place).toMatchObject({
      address: 'House 22, Sample Street',
      lat: null,
      sourceRaw: 'https://example.com/invite',
    });
  });

  it('offers shared words as the address to check, since they may not be one (R2.4)', async () => {
    await open('See you on Friday');
    await fireEvent.press(await screen.findByRole('button', { name: 'Type the address of this place' }));
    expect(screen.getByLabelText('Address').props.value).toBe('See you on Friday');
  });

  it('asks for contacts only after Allow, then suggests them (R3.1)', async () => {
    contactsMock.getAccess.mockResolvedValue('not_asked');
    contactsMock.requestAccess.mockResolvedValue('all');
    await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    expect(contactsMock.requestAccess).not.toHaveBeenCalled();
    await fireEvent(screen.getByLabelText('Whose place is this?'), 'focus');
    contactsMock.loadContacts.mockResolvedValue([
      { contactRef: 'c-9', name: 'Zara Sample', phone: null, photoUri: null },
    ]);
    await fireEvent.press(screen.getByRole('button', { name: 'Allow MindPin to read your contacts' }));
    await waitFor(() => expect(contactsMock.requestAccess).toHaveBeenCalledTimes(1));
    await fireEvent.changeText(screen.getByLabelText('Whose place is this?'), 'Zar');
    expect(await screen.findByRole('button', { name: 'Choose Zara Sample' })).toBeTruthy();
  });

  it('closes without saving on Cancel', async () => {
    const { db, onClose } = await open(PIN_LINK);
    await fireEvent.press(await screen.findByRole('button', { name: 'Close without saving' }));
    expect(onClose).toHaveBeenCalledWith('cancelled');
    expect(await listPlaceSummaries(db)).toEqual([]);
  });

  it('says so and stays open when the place cannot be saved', async () => {
    const { onClose } = await open(PIN_LINK);
    await screen.findByText('Main Boulevard, Gulberg');
    (getDatabase as jest.Mock).mockRejectedValueOnce(new Error('closed'));
    await fireEvent.press(save());
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('The place could not be saved. Try again.'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts on the person it was opened for (R4.7)', async () => {
    const db = await freshDb();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    const person = await createPerson(db, { name: 'Ahmed Sample' });
    const { onClose } = await open('House 22, Sample Street', { initialPersonId: person.id, sourceApp: null, manual: true });
    expect(await screen.findByText('Address from the text')).toBeTruthy();
    expect(screen.queryByText(/Shared from/)).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: 'Save this place to Ahmed Sample' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('saved'));
    expect((await listPlaceSummaries(db))[0]).toMatchObject({ personName: 'Ahmed Sample', place: { address: 'House 22, Sample Street' } });
  });
});
