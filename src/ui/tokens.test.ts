// T130, T145: every text and background pair is readable in both themes (R11.3,
// non-functional: accessibility).
import { darkColors, lightColors, type Colors } from './tokens';

function luminance(hex: string): number {
  const channel = (at: number) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Text color, then the background it is drawn on.
const PAIRS: [keyof Colors, keyof Colors][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['mutedText', 'background'],
  ['mutedText', 'surface'],
  ['secondaryText', 'background'],
  ['secondaryText', 'surface'],
  ['accent', 'background'],
  ['accent', 'surface'],
  ['amberText', 'background'],
  ['amberText', 'amberTint'],
  ['amberTagText', 'amberTint'],
  ['secondaryText', 'amberTint'],
  ['tealText', 'tealTint'],
  ['tealText', 'tealSoft'],
  ['text', 'tealSoft'],
  ['indigoText', 'indigoTint'],
  ['onAccent', 'accent'],
  ['onDark', 'darkSurface'],
  ['darkMutedText', 'darkSurface'],
  ['darkAction', 'darkSurface'],
  ['scrimText', 'scrim'],
  ['bubbleText', 'bubble'],
  // A selected chip: the text color becomes the background.
  ['surface', 'text'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s theme', (_name, colors) => {
  it.each(PAIRS)('%s on %s is at least 4.5:1', (text, background) => {
    expect(contrast(colors[text], colors[background])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('themes', () => {
  it('define the same tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('use an orange accent in the dark theme and keep the designed teal in the light one', () => {
    expect(darkColors.accent).toBe('#D97757');
    expect(lightColors.accent).toBe('#0F766E');
  });
});
