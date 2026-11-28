// The light and dark themes (R11). Components read colors only through these hooks, so the
// whole app changes when the phone's setting does, or when the user picks a theme.
import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type Colors } from './tokens';

export type Scheme = 'light' | 'dark';
// "system" follows the phone.
export type ThemePreference = Scheme | 'system';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

// The user's choice, held here for the whole app. Storing it is the caller's job
// (features/settings/themePreference.ts).
let preference: ThemePreference = 'system';
const listeners = new Set<() => void>();

export function getThemePreference(): ThemePreference {
  return preference;
}

export function setThemePreference(next: ThemePreference): void {
  if (next === preference) return;
  preference = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, getThemePreference);
}

export function colorsFor(scheme: Scheme): Colors {
  return scheme === 'dark' ? darkColors : lightColors;
}

// The theme in use: the user's choice, or the phone's setting when they have not chosen.
export function useScheme(): Scheme {
  const chosen = useThemePreference();
  const phone = useColorScheme() === 'dark' ? 'dark' : 'light';
  return chosen === 'system' ? phone : chosen;
}

// The colors of the theme in use.
export function useColors(): Colors {
  return colorsFor(useScheme());
}

// Wraps a component's styles so they are built once per theme:
//   const useStyles = themed((colors) => StyleSheet.create({ ... }));
//   const styles = useStyles();
export function themed<T>(make: (colors: Colors) => T): () => T {
  const built: Partial<Record<Scheme, T>> = {};
  return function useStyles() {
    const scheme = useScheme();
    return (built[scheme] ??= make(colorsFor(scheme)));
  };
}
