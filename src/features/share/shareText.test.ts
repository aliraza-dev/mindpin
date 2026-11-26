// T050: text for the system share menu (R4.6, R4.8).
import { parseShared } from '../../parser/parseShared';
import { personPlacesShareText, placeShareText } from './shareText';

type Shareable = Parameters<typeof placeShareText>[0];

function place(overrides: Partial<Shareable> = {}): Shareable {
  return {
    title: 'Home',
    lat: 31.5204,
    lng: 74.3587,
    address: 'House 22, Sample Street',
    ...overrides,
  };
}

describe('placeShareText (R4.6)', () => {
  it('gives the address and a maps link', () => {
    expect(placeShareText(place())).toBe(
      'House 22, Sample Street\nhttps://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587',
    );
  });

  it('gives a link MindPin itself can read back to the same pin', () => {
    const text = placeShareText(place({ lat: -33.868812345, lng: 151.2093 }));
    expect(parseShared(text ?? '')).toMatchObject({ kind: 'coordinates', lat: -33.868812, lng: 151.2093 });
  });

  it('links to the address when the place has no coordinates', () => {
    expect(placeShareText(place({ lat: null, lng: null, address: 'Corner Shop & Café, Sample Town' }))).toBe(
      'Corner Shop & Café, Sample Town\nhttps://www.google.com/maps/search/?api=1&query=Corner%20Shop%20%26%20Caf%C3%A9%2C%20Sample%20Town',
    );
  });

  it('gives just the link when there is no address', () => {
    expect(placeShareText(place({ address: null }))).toBe(
      'https://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587',
    );
  });

  it('gives nothing when the place has neither coordinates nor an address', () => {
    expect(placeShareText(place({ lat: null, lng: null, address: '  ' }))).toBeNull();
  });

  it('never includes notes or tags', () => {
    const withSecrets = { ...place(), notes: 'Gate code 4471', tags: ['code 4471'] };
    expect(placeShareText(withSecrets)).not.toContain('4471');
  });
});

describe('personPlacesShareText (R4.8)', () => {
  it("lists each place with its label, address, and maps link", () => {
    const text = personPlacesShareText([
      place(),
      place({ title: 'Shop', lat: 1.5, lng: 2.5, address: 'Main Boulevard' }),
    ]);
    expect(text).toBe(
      [
        'Home',
        'House 22, Sample Street',
        'https://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587',
        '',
        'Shop',
        'Main Boulevard',
        'https://www.google.com/maps/search/?api=1&query=1.5%2C2.5',
      ].join('\n'),
    );
  });

  it('leaves out places that have nothing to share, and notes and tags', () => {
    const withSecrets = { ...place(), notes: 'Gate code 4471', tags: ['code 4471'] };
    const text = personPlacesShareText([
      withSecrets,
      place({ title: 'Unknown', lat: null, lng: null, address: null }),
    ]);
    expect(text).not.toContain('Unknown');
    expect(text).not.toContain('4471');
  });

  it('gives nothing when no place can be shared', () => {
    expect(personPlacesShareText([])).toBeNull();
    expect(personPlacesShareText([place({ lat: null, lng: null, address: null })])).toBeNull();
  });
});
