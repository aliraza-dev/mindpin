// T054: what the edit form accepts for a place (R4.1, R4.2, R4.10; design.md "Limits on typed text").
import { labelChoice, parseTags, tagsToText, validatePlaceForm, type PlaceFormValues } from './placeForm';

function values(overrides: Partial<PlaceFormValues> = {}): PlaceFormValues {
  return { label: 'Home', address: 'House 22, Sample Street', notes: '', tagsText: '', ...overrides };
}

describe('labelChoice (R4.1)', () => {
  it('matches Home, Shop, and Office whatever the letter case', () => {
    expect(labelChoice('Home')).toBe('Home');
    expect(labelChoice(' shop ')).toBe('Shop');
    expect(labelChoice('OFFICE')).toBe('Office');
  });

  it('treats any other label as custom', () => {
    expect(labelChoice('Farmhouse')).toBe('custom');
    expect(labelChoice('')).toBe('custom');
  });
});

describe('parseTags (R4.2)', () => {
  it('splits on commas and new lines, and tidies the spaces', () => {
    expect(parseTags(' Gate code 4471 ,2nd   floor\nParking at back ')).toEqual([
      'Gate code 4471',
      '2nd floor',
      'Parking at back',
    ]);
  });

  it('drops empty tags and repeats, ignoring letter case', () => {
    expect(parseTags('Parking,, parking , PARKING,Floor 2')).toEqual(['Parking', 'Floor 2']);
    expect(parseTags('  ,\n ')).toEqual([]);
  });

  it('gives back the same tags after being shown as text', () => {
    const tags = ['Gate code 4471', '2nd floor'];
    expect(tagsToText(tags)).toBe('Gate code 4471, 2nd floor');
    expect(parseTags(tagsToText(tags))).toEqual(tags);
  });
});

describe('validatePlaceForm', () => {
  it('accepts a filled form and trims what was typed', () => {
    const result = validatePlaceForm(
      values({ label: '  Farmhouse ', address: ' Canal Road ', notes: ' White gate ', tagsText: 'Parking, Gate 12' }),
      { hasPin: true },
    );
    expect(result).toEqual({
      ok: true,
      value: { title: 'Farmhouse', address: 'Canal Road', notes: 'White gate', tags: ['Parking', 'Gate 12'] },
    });
  });

  it('stores empty notes and an empty address as nothing', () => {
    const result = validatePlaceForm(values({ address: '  ', notes: '' }), { hasPin: true });
    expect(result).toEqual({ ok: true, value: { title: 'Home', address: null, notes: null, tags: [] } });
  });

  it('requires a label (R4.1)', () => {
    expect(validatePlaceForm(values({ label: '   ' }), { hasPin: true })).toEqual({
      ok: false,
      errors: { label: 'labelRequired' },
    });
  });

  it('requires an address when the place has no pin (R4.10)', () => {
    expect(validatePlaceForm(values({ address: ' ' }), { hasPin: false })).toEqual({
      ok: false,
      errors: { address: 'addressRequired' },
    });
  });

  it('refuses text over the limits', () => {
    const result = validatePlaceForm(
      values({
        label: 'x'.repeat(41),
        address: 'x'.repeat(301),
        notes: 'x'.repeat(2001),
        tagsText: 'x'.repeat(41),
      }),
      { hasPin: true },
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        label: 'labelTooLong',
        address: 'addressTooLong',
        notes: 'notesTooLong',
        tags: 'tagTooLong',
      },
    });
  });

  it('accepts text exactly at the limits', () => {
    const result = validatePlaceForm(
      values({
        label: 'x'.repeat(40),
        address: 'x'.repeat(300),
        notes: 'x'.repeat(2000),
        tagsText: Array.from({ length: 10 }, (_, i) => `tag ${i}`).join(','),
      }),
      { hasPin: true },
    );
    expect(result.ok).toBe(true);
  });

  it('refuses more than 10 tags', () => {
    const tagsText = Array.from({ length: 11 }, (_, i) => `tag ${i}`).join(',');
    expect(validatePlaceForm(values({ tagsText }), { hasPin: true })).toEqual({
      ok: false,
      errors: { tags: 'tooManyTags' },
    });
  });
});
