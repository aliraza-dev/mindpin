import { i18n, initI18n, isRtlLanguage } from './index';

describe('translations (non-functional: languages)', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('loads English strings from the common namespace', () => {
    expect(i18n.t('common:tabs.home')).toBe('Home');
  });

  it('flags missing keys instead of showing them silently', () => {
    expect(i18n.exists('common:does.not.exist')).toBe(false);
  });

  it('knows which languages are right-to-left', () => {
    expect(isRtlLanguage('ur')).toBe(true);
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('en')).toBe(false);
  });
});
