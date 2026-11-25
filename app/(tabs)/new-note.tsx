import { PlaceholderScreen } from '../../src/ui/PlaceholderScreen';

// Placeholder until never shown: the tab press opens /note/new. Expo Router requires a default export.
export default function NewNoteTabRoute() {
  return <PlaceholderScreen titleKey="common:tabs.newNote" />;
}
