// The colors a person can be given (owner request, 2026-11-28): the theme color, Claude's
// orange, and the soft colors of a sticky-note pad. The color fills the person's whole row in
// the list; the circle with their initials keeps its own tint. Each color names the text that is readable on it (at least 4.5:1).
import type { Colors } from './tokens';

export const PERSON_COLORS = [
  'theme',
  'orange',
  'coral',
  'peach',
  'sand',
  'mint',
  'sage',
  'fog',
  'storm',
  'dusk',
  'blossom',
  'clay',
  'chalk',
] as const;

export type PersonColor = (typeof PERSON_COLORS)[number];

// Only these names are ever stored or read back.
export function isPersonColor(value: unknown): value is PersonColor {
  return typeof value === 'string' && (PERSON_COLORS as readonly string[]).includes(value);
}

// The same person always gets the same tint, in the colors of the current theme.
export function tintFor(key: string, colors: Colors) {
  const tints = [
    { background: colors.tealTint, text: colors.tealText },
    { background: colors.amberTint, text: colors.amberText },
    { background: colors.indigoTint, text: colors.indigoText },
  ];
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % tints.length;
  return tints[sum];
}

const INK = '#14171F';

// The same in both themes, as a paper note is the same color in any light.
const PAPER: Record<Exclude<PersonColor, 'theme'>, { background: string; text: string }> = {
  orange: { background: '#D97757', text: '#1F1E1D' },
  coral: { background: '#FAAFA8', text: INK },
  peach: { background: '#F39F76', text: INK },
  sand: { background: '#FFF8B8', text: INK },
  mint: { background: '#E2F6D3', text: INK },
  sage: { background: '#B4DDD3', text: INK },
  fog: { background: '#D4E4ED', text: INK },
  storm: { background: '#AECCDC', text: INK },
  dusk: { background: '#D3BFDB', text: INK },
  blossom: { background: '#F6E2DD', text: INK },
  clay: { background: '#E9E3D4', text: INK },
  chalk: { background: '#EFEFF1', text: INK },
};

// The background and text of a person's row in their chosen color. Null when no color was
// chosen: the row is then drawn like any other.
export function personPaint(color: string | null | undefined, colors: Colors) {
  if (!isPersonColor(color)) return null;
  if (color === 'theme') return { background: colors.accent, text: colors.onAccent };
  return PAPER[color];
}
