import { useLocalSearchParams } from 'expo-router';

import { EditPersonScreen } from '../../../src/features/people/EditPersonScreen';
import { isId } from '../../../src/lib/id';

// This address can be opened from outside the app, so the id is checked before it is used.
// Opening it only shows the form: nothing changes until Save is tapped.
// Expo Router requires a default export for route files.
export default function EditPersonRoute() {
  const { id } = useLocalSearchParams();
  return <EditPersonScreen personId={isId(id) ? id : null} />;
}
