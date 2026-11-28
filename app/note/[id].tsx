import { useLocalSearchParams } from 'expo-router';

import { NoteScreen } from '../../src/features/notes/NoteScreen';
import { isId } from '../../src/lib/id';

// This address can be opened from outside the app, so every id is checked before it is used.
// "/note/new" opens a blank note; nothing is stored until the user types.
// Expo Router requires a default export for route files.
export default function NoteRoute() {
  const { id, personId, placeId } = useLocalSearchParams();
  const isNew = id === 'new';
  return (
    <NoteScreen
      noteId={isId(id) ? id : null}
      validId={isNew || isId(id)}
      personId={isNew && isId(personId) ? personId : null}
      placeId={isNew && isId(placeId) ? placeId : null}
    />
  );
}
