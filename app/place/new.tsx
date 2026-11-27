import { useLocalSearchParams } from 'expo-router';

import { AddPlaceScreen } from '../../src/features/places/AddPlaceScreen';
import { isId } from '../../src/lib/id';

// This address can be opened from outside the app, so the person id is checked before it is
// used. Opening it only shows the form: nothing is saved until Save is tapped.
// Expo Router requires a default export for route files.
export default function NewPlaceRoute() {
  const { personId } = useLocalSearchParams();
  return <AddPlaceScreen personId={isId(personId) ? personId : null} />;
}
