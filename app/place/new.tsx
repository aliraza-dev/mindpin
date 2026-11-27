import { PlaceholderScreen } from '../../src/ui/PlaceholderScreen';

// Placeholder until adding a place by hand is built (T063). Expo Router requires a default export.
export default function NewPlaceRoute() {
  return <PlaceholderScreen titleKey="people:addPlace" />;
}
