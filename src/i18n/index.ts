import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './en/common.json';
import enHome from './en/home.json';
import enPeople from './en/people.json';
import enPlaces from './en/places.json';
import enVisits from './en/visits.json';

// All user-facing text lives in translation files, one per feature: src/i18n/en/<feature>.json.
// Add each new feature file to `resources` below.
export const resources = {
  en: { common: enCommon, home: enHome, people: enPeople, places: enPlaces, visits: enVisits },
} as const;

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

export function isRtlLanguage(language: string): boolean {
  return RTL_LANGUAGES.has(language.split('-')[0].toLowerCase());
}

export const i18n = i18next;

// A plainly typed way to translate from code outside React components.
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export const translate: Translate = (key, options) => i18n.t(key, options ?? {});

export async function initI18n(language: string): Promise<void> {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(language);
    return;
  }
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}
