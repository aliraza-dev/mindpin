// T034: what the save sheet can show before Save is tapped (R2.2, R2.3, R2.4, R1.5).
import type { ParsedLocation } from '../../parser/types';
import type { Geocoder } from '../geocode/geocode';
import type { LookupDeps } from '../resolve/retryQueue';
import { previewShared } from './preview';

const PIN: ParsedLocation = {
  kind: 'coordinates',
  lat: 1.5,
  lng: 2.5,
  source: 'google_maps',
  snapshot: false,
};
const LINK: ParsedLocation = { kind: 'needs_resolve', url: 'https://maps.app.goo.gl/AbC123' };

function makeDeps(overrides: { resolveLink?: jest.Mock; geocoder?: Partial<Geocoder> } = {}) {
  const geocoder = {
    addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Canal Road' }),
    coordinatesFor: jest.fn().mockResolvedValue({ kind: 'none' }),
    ...overrides.geocoder,
  };
  const resolveLink =
    overrides.resolveLink ?? jest.fn().mockResolvedValue({ kind: 'coordinates', lat: 3, lng: 4 });
  const deps: LookupDeps = { resolveLink, geocoder };
  return { deps, resolveLink, geocoder };
}

describe('previewShared', () => {
  it('looks up the address of a pin (R2.3)', async () => {
    const { deps } = makeDeps();
    expect(await previewShared(PIN, deps)).toEqual({
      location: PIN,
      address: 'Canal Road',
      waiting: false,
    });
  });

  it('keeps the pin and waits for the address when the lookup cannot run', async () => {
    const { deps } = makeDeps({
      geocoder: { addressFor: jest.fn().mockResolvedValue({ kind: 'retry' }) },
    });
    expect(await previewShared(PIN, deps)).toEqual({ location: PIN, address: null, waiting: true });
  });

  it('follows a short link to its pin and address (R2.2)', async () => {
    const { deps, resolveLink } = makeDeps();
    const preview = await previewShared(LINK, deps);
    expect(resolveLink).toHaveBeenCalledWith('https://maps.app.goo.gl/AbC123');
    expect(preview).toEqual({
      location: { kind: 'coordinates', lat: 3, lng: 4, source: 'google_maps', snapshot: false },
      address: 'Canal Road',
      waiting: false,
    });
  });

  it('leaves a short link to be opened later when offline (R1.5)', async () => {
    const { deps } = makeDeps({ resolveLink: jest.fn().mockResolvedValue({ kind: 'retry' }) });
    expect(await previewShared(LINK, deps)).toEqual({
      location: LINK,
      address: null,
      waiting: true,
    });
  });

  it('treats a dead short link as having no location (R1.4)', async () => {
    const { deps } = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'unresolvable' }),
    });
    expect(await previewShared(LINK, deps)).toEqual({
      location: { kind: 'not_found' },
      address: null,
      waiting: false,
    });
  });

  it('uses the place name a short link leads to as the address', async () => {
    const { deps } = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'text', text: 'Blue Pharmacy' }),
    });
    expect(await previewShared(LINK, deps)).toEqual({
      location: { kind: 'text', text: 'Blue Pharmacy' },
      address: 'Blue Pharmacy',
      waiting: false,
    });
  });

  it('shows shared address text as the address, with no network call (R2.4)', async () => {
    const { deps, resolveLink, geocoder } = makeDeps();
    const text: ParsedLocation = { kind: 'text', text: 'House 22, Sample Street' };
    expect(await previewShared(text, deps)).toEqual({
      location: text,
      address: 'House 22, Sample Street',
      waiting: false,
    });
    expect(resolveLink).not.toHaveBeenCalled();
    expect(geocoder.addressFor).not.toHaveBeenCalled();
  });

  it('never fails: a lookup that throws is left for later', async () => {
    const { deps } = makeDeps({
      geocoder: { addressFor: jest.fn().mockRejectedValue(new Error('x')) },
    });
    expect(await previewShared(PIN, deps)).toEqual({ location: PIN, address: null, waiting: true });
  });
});
