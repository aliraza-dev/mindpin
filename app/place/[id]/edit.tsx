import { useLocalSearchParams } from 'expo-router';

import { EditPlaceScreen } from '../../../src/features/places/EditPlaceScreen';
import { isId } from '../../../src/lib/id';

// This address can be opened from outside the app, so the id is checked before it is used.
// Opening it only shows the form: nothing changes until Save is tapped.
// Expo Router requires a default export for route files.
export default function EditPlaceRoute() {
  const { id } = useLocalSearchParams();
  return <EditPlaceScreen placeId={isId(id) ? id : null} />;
}
