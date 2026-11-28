import { i18n, initI18n } from '../../i18n';
import { tabs } from './tabs';

describe('bottom bar (R6.5)', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('has Home, Map, and Settings in that order, with no + button in the bar', () => {
    expect(tabs.map((t) => t.name)).toEqual(['index', 'map', 'settings']);
  });

  it('has no Ask MindPin tab in v1', () => {
    expect(tabs.some((t) => /ask/i.test(t.name))).toBe(false);
  });

  it('gives every tab a translated label and accessibility label', () => {
    for (const tab of tabs) {
      expect(i18n.exists(tab.labelKey)).toBe(true);
      expect(i18n.exists(tab.accessibilityKey)).toBe(true);
    }
  });

  it('gives every tab an icon, since the bar shows no text', () => {
    for (const tab of tabs) expect(tab.icon).toBeTruthy();
  });
});
