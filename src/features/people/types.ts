// The only details MindPin reads from a device contact (R3.6).
export type DeviceContact = {
  // The phone's own ID for the contact; only meaningful on this device.
  contactRef: string;
  name: string;
  phone: string | null;
  photoUri: string | null;
};
