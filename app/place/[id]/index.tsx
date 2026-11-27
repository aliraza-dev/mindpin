import { useLocalSearchParams } from 'expo-router';

import { PlaceScreen } from '../../../src/features/places/PlaceScreen';
import { isId } from '../../../src/lib/id';

// This address can be opened from outside the app, so the id is checked before it is used.
// Expo Router requires a default export for route files.
export default function PlaceRoute() {
  const { id } = useLocalSearchParams();
  return <PlaceScreen placeId={isId(id) ? id : null} />;
}
