// Bottom bar (R6.5): Home, Map, New note (+), Settings. Ask MindPin is not in v1.
export type TabConfig = {
  // Route file name under app/(tabs)/.
  name: 'index' | 'map' | 'new-note' | 'settings';
  labelKey: string;
  accessibilityKey: string;
  // Set when tapping the tab opens a route instead of showing a tab screen.
  opensRoute?: '/note/new';
};

export const tabs: TabConfig[] = [
  { name: 'index', labelKey: 'common:tabs.home', accessibilityKey: 'common:a11y.home' },
  { name: 'map', labelKey: 'common:tabs.map', accessibilityKey: 'common:a11y.map' },
  {
    name: 'new-note',
    labelKey: 'common:tabs.newNote',
    accessibilityKey: 'common:a11y.newNote',
    opensRoute: '/note/new',
  },
  {
    name: 'settings',
    labelKey: 'common:tabs.settings',
    accessibilityKey: 'common:a11y.settings',
  },
];
