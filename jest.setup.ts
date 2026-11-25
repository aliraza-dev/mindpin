// expo-crypto is native; tests use Node's crypto for UUIDs.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID(),
}));
