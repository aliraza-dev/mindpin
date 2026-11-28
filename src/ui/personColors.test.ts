// The colors a person can be given (R3.12, R11.3).
import { PERSON_COLORS, isPersonColor, personPaint } from './personColors';
import { darkColors, lightColors } from './tokens';

function luminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const part = ((value >> shift) & 255) / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('person colors', () => {
  it('offers the theme color, Claude orange, and the sticky-note colors', () => {
    expect(PERSON_COLORS.slice(0, 2)).toEqual(['theme', 'orange']);
    expect(PERSON_COLORS).toHaveLength(13);
    expect(personPaint('orange', lightColors)?.background).toBe('#D97757');
    expect(personPaint('theme', lightColors)?.background).toBe(lightColors.accent);
    expect(personPaint('theme', darkColors)?.background).toBe(darkColors.accent);
  });

  it('keeps the writing readable on every color, in both themes', () => {
    for (const colors of [lightColors, darkColors]) {
      for (const name of PERSON_COLORS) {
        const paint = personPaint(name, colors);
        expect(contrast(paint!.background, paint!.text)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('paints nothing for no color or an unknown one', () => {
    expect(personPaint(null, lightColors)).toBeNull();
    expect(personPaint('#ff0000', lightColors)).toBeNull();
    expect(isPersonColor('mint')).toBe(true);
    expect(isPersonColor('Mint')).toBe(false);
    expect(isPersonColor(null)).toBe(false);
  });
});
