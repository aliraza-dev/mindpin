// T029: lookups with a mocked platform geocoder (R2.3, R2.4).
import { createGeocoder, formatAddress, type PlatformGeocoder } from './geocode';

function platform(overrides: Partial<PlatformGeocoder> = {}): PlatformGeocoder {
  return {
    reverse: jest.fn().mockResolvedValue([]),
    forward: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('formatAddress', () => {
  it('uses the platform-formatted line when there is one', () => {
    expect(formatAddress({ formattedAddress: ' 22 Street 14, Sample Town ', city: 'Other' })).toBe(
      '22 Street 14, Sample Town',
    );
  });

  it('builds a line from street, district, city, and region', () => {
    expect(
      formatAddress({
        streetNumber: '22',
        street: 'Street 14',
        district: 'Block C',
        city: 'Sample Town',
        region: 'Sample Region',
      }),
    ).toBe('22 Street 14, Block C, Sample Town, Sample Region');
  });

  it('falls back to the place name and drops repeated parts', () => {
    expect(
      formatAddress({ name: 'Corner Shop', district: 'Sample Town', city: 'sample town' }),
    ).toBe('Corner Shop, Sample Town');
  });

  it('returns null when the platform gave nothing usable', () => {
    expect(formatAddress({ street: '  ', city: null })).toBeNull();
  });
});

describe('geocoder', () => {
  it('gives a readable address for coordinates (R2.3)', async () => {
    const p = platform({
      reverse: jest.fn().mockResolvedValue([{ street: 'Main Boulevard', city: 'Sample Town' }]),
    });
    const result = await createGeocoder(p).addressFor({ lat: 31.5, lng: 74.3 });
    expect(result).toEqual({ kind: 'found', value: 'Main Boulevard, Sample Town' });
    expect(p.reverse).toHaveBeenCalledWith({ lat: 31.5, lng: 74.3 });
  });

  it('gives coordinates for an address (R2.4)', async () => {
    const p = platform({
      forward: jest.fn().mockResolvedValue([
        { lat: 31.5, lng: 74.3 },
        { lat: 1, lng: 1 },
      ]),
    });
    const result = await createGeocoder(p).coordinatesFor('  Main Boulevard  ');
    expect(result).toEqual({ kind: 'found', value: { lat: 31.5, lng: 74.3 } });
    expect(p.forward).toHaveBeenCalledWith('Main Boulevard');
  });

  it('reports no match in either direction', async () => {
    const geocoder = createGeocoder(platform());
    expect(await geocoder.addressFor({ lat: 31.5, lng: 74.3 })).toEqual({ kind: 'none' });
    expect(await geocoder.coordinatesFor('Nowhere at all')).toEqual({ kind: 'none' });
  });

  it('asks to retry later when the platform lookup fails, such as when offline', async () => {
    const geocoder = createGeocoder(
      platform({
        reverse: jest.fn().mockRejectedValue(new Error('offline')),
        forward: jest.fn().mockRejectedValue(new Error('offline')),
      }),
    );
    expect(await geocoder.addressFor({ lat: 31.5, lng: 74.3 })).toEqual({ kind: 'retry' });
    expect(await geocoder.coordinatesFor('Main Boulevard')).toEqual({ kind: 'retry' });
  });

  it('does not ask the platform about blank addresses or invalid coordinates', async () => {
    const p = platform();
    const geocoder = createGeocoder(p);
    expect(await geocoder.coordinatesFor('   ')).toEqual({ kind: 'none' });
    expect(await geocoder.addressFor({ lat: 120, lng: 74.3 })).toEqual({ kind: 'none' });
    expect(p.forward).not.toHaveBeenCalled();
    expect(p.reverse).not.toHaveBeenCalled();
  });

  it('skips unusable platform results', async () => {
    const geocoder = createGeocoder(
      platform({
        reverse: jest.fn().mockResolvedValue([{ city: null }, { city: 'Sample Town' }]),
        forward: jest.fn().mockResolvedValue([{ lat: 200, lng: 0 }]),
      }),
    );
    expect(await geocoder.addressFor({ lat: 31.5, lng: 74.3 })).toEqual({
      kind: 'found',
      value: 'Sample Town',
    });
    expect(await geocoder.coordinatesFor('Main Boulevard')).toEqual({ kind: 'none' });
  });
});
