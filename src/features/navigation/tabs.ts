import type { IconName } from '../../ui/Icon';

// Bottom bar (R6.5): Home, Map, New note (+), Settings. Ask MindPin is not in v1.
export type TabConfig = {
  // Route file name under app/(tabs)/.
  name: 'index' | 'map' | 'new-note' | 'settings';
  // The bar shows icons only, as in the Home frame; the labels are for screen readers.
  icon: IconName;
  labelKey: string;
  accessibilityKey: string;
  // Set when tapping the tab opens a route instead of showing a tab screen.
  opensRoute?: '/note/new';
};

export const tabs: TabConfig[] = [
  { name: 'index', icon: 'navHome', labelKey: 'common:tabs.home', accessibilityKey: 'common:a11y.home' },
  { name: 'map', icon: 'navMap', labelKey: 'common:tabs.map', accessibilityKey: 'common:a11y.map' },
  {
    name: 'new-note',
    icon: 'navPlus',
    labelKey: 'common:tabs.newNote',
    accessibilityKey: 'common:a11y.newNote',
    opensRoute: '/note/new',
  },
  {
    name: 'settings',
    icon: 'navSettings',
    labelKey: 'common:tabs.settings',
    accessibilityKey: 'common:a11y.settings',
  },
];
