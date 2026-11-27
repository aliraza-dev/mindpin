import { useLocalSearchParams } from 'expo-router';

import { PersonScreen } from '../../../src/features/people/PersonScreen';
import { isId } from '../../../src/lib/id';

// This address can be opened from outside the app, so the id is checked before it is used.
// Expo Router requires a default export for route files.
export default function PersonRoute() {
  const { id } = useLocalSearchParams();
  return <PersonScreen personId={isId(id) ? id : null} />;
}
