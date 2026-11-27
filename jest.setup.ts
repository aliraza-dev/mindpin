// expo-crypto is native; tests use Node's crypto for UUIDs.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID(),
}));

// react-native-maps is native; tests draw the map and its pin as plain views that keep the
// props they were given, so a test can check what the map was asked to show.
jest.mock('react-native-maps', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = (props: object) => React.createElement(View, props);
  const Marker = (props: object) => React.createElement(View, { testID: 'map-pin', ...props });
  return { __esModule: true, default: MapView, Marker };
});
