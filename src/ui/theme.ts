// The light and dark themes (R11). Components read colors only through these hooks, so the
// whole app changes when the phone's setting does.
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type Colors } from './tokens';

export type Scheme = 'light' | 'dark';

export function colorsFor(scheme: Scheme): Colors {
  return scheme === 'dark' ? darkColors : lightColors;
}

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

// The colors of the theme the phone is set to.
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
