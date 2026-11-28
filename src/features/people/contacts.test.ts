// T041: the on-device contacts bridge reads only what MindPin stores (R3.6).
import { createContactsBridge, type ContactsApi } from './contacts';

// The real module is native; the bridge is tested through its injected API.
jest.mock('expo-contacts', () => ({
  Contact: { getAllDetails: jest.fn() },
  ContactField: { FULL_NAME: 'fullName', PHONES: 'phones', THUMBNAIL: 'thumbnail' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

function api(overrides: Partial<ContactsApi> = {}): ContactsApi {
  return {
    getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
    getAllDetails: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('contacts bridge', () => {
  it('asks the phone for the name, phone numbers, and photo only', async () => {
    const source = api();
    await createContactsBridge(source).loadContacts();
    expect(source.getAllDetails).toHaveBeenCalledWith(['fullName', 'phones', 'thumbnail']);
  });

  it('keeps only the contact ID, name, first phone number, and photo reference', async () => {
    const source = api({
      getAllDetails: jest.fn().mockResolvedValue([
        {
          id: 'c-1',
          fullName: '  Sample Person ',
          phones: [{ number: ' ' }, { number: ' +10000000000 ' }, { number: '+19999999999' }],
          thumbnail: 'content://photo/1',
          emails: [{ address: 'person@example.com' }],
          addresses: [{ street: 'Sample Road' }],
        },
        { id: 'c-2', fullName: 'No Phone', phones: [], thumbnail: null },
      ]),
    });
    expect(await createContactsBridge(source).loadContacts()).toEqual([
      {
        contactRef: 'c-1',
        name: 'Sample Person',
        phone: '+10000000000',
        photoUri: 'content://photo/1',
      },
      { contactRef: 'c-2', name: 'No Phone', phone: null, photoUri: null },
    ]);
  });

  it('leaves out contacts with no name', async () => {
    const source = api({
      getAllDetails: jest.fn().mockResolvedValue([
        { id: 'c-1', fullName: null, phones: [{ number: '+10000000000' }] },
        { id: 'c-2', fullName: '   ' },
      ]),
    });
    expect(await createContactsBridge(source).loadContacts()).toEqual([]);
  });

  it('reads nothing and never prompts when access has not been granted (R3.4)', async () => {
    const source = api({
      getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, status: 'denied' }),
    });
    expect(await createContactsBridge(source).loadContacts()).toEqual([]);
    expect(source.getAllDetails).not.toHaveBeenCalled();
    expect(source.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('reports full, limited, denied, and not-yet-asked access', async () => {
    const access = (response: object) =>
      createContactsBridge(
        api({ getPermissionsAsync: jest.fn().mockResolvedValue(response) }),
      ).getAccess();
    expect(await access({ granted: true, status: 'granted', accessPrivileges: 'all' })).toBe('all');
    expect(await access({ granted: true, status: 'granted', accessPrivileges: 'limited' })).toBe(
      'limited',
    );
    expect(await access({ granted: false, status: 'denied' })).toBe('denied');
    expect(await access({ granted: false, status: 'undetermined' })).toBe('not_asked');
  });

  it('asks for access only when told to (R3.1)', async () => {
    const source = api({
      requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, status: 'denied' }),
    });
    expect(await createContactsBridge(source).requestAccess()).toBe('denied');
    expect(source.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});
