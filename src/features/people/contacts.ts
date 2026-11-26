// On-device contacts bridge (R3.1, R3.4, R3.6). Contacts are read on request, kept in memory
// only, and never sent anywhere: this module has no network code, and only the contact the
// user picks is stored (name, phone, photo reference, and the phone's contact ID).
import { Contact, ContactField, getPermissionsAsync, requestPermissionsAsync } from 'expo-contacts';

import type { DeviceContact } from './types';

// 'limited' is iOS 18's "selected contacts only".
export type ContactsAccess = 'all' | 'limited' | 'denied' | 'not_asked';

type PermissionResponse = {
  granted: boolean;
  status?: string;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

type RawContact = {
  id: string;
  fullName?: string | null;
  phones?: { number?: string | null }[] | null;
  thumbnail?: string | null;
};

// The part of expo-contacts the bridge uses, so tests can stand in for the phone.
export type ContactsApi = {
  getPermissionsAsync(): Promise<PermissionResponse>;
  requestPermissionsAsync(): Promise<PermissionResponse>;
  getAllDetails(fields: readonly string[]): Promise<RawContact[]>;
};

// The only fields ever requested from the address book.
const FIELDS = [ContactField.FULL_NAME, ContactField.PHONES, ContactField.THUMBNAIL] as const;

function toAccess(response: PermissionResponse): ContactsAccess {
  if (response.granted) return response.accessPrivileges === 'limited' ? 'limited' : 'all';
  return response.status === 'undetermined' ? 'not_asked' : 'denied';
}

function toDeviceContact(raw: RawContact): DeviceContact | null {
  const name = (raw.fullName ?? '').trim();
  if (!name) return null;
  const phone = (raw.phones ?? []).map((p) => (p.number ?? '').trim()).find(Boolean) ?? null;
  return { contactRef: raw.id, name, phone, photoUri: raw.thumbnail ?? null };
}

export function createContactsBridge(api: ContactsApi) {
  return {
    async getAccess(): Promise<ContactsAccess> {
      return toAccess(await api.getPermissionsAsync());
    },

    // Shows the system permission prompt. Call it only when the user first tries to pick a
    // contact, after showing the one-line reason (R3.1).
    async requestAccess(): Promise<ContactsAccess> {
      return toAccess(await api.requestPermissionsAsync());
    },

    // Every contact the app may see, for in-memory matching while the picker is open.
    // Returns nothing, without prompting, when access has not been granted (R3.4).
    async loadContacts(): Promise<DeviceContact[]> {
      const access = toAccess(await api.getPermissionsAsync());
      if (access !== 'all' && access !== 'limited') return [];
      const raw = await api.getAllDetails(FIELDS);
      return raw.map(toDeviceContact).filter((c): c is DeviceContact => c !== null);
    },
  };
}

export const deviceContacts = createContactsBridge({
  getPermissionsAsync,
  requestPermissionsAsync,
  getAllDetails: () => Contact.getAllDetails(FIELDS),
});
