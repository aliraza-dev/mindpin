// T139: the adapter between the lookup logic and the native address lookup module.
import { createGeocoder } from './geocode';
import { createPlatformGeocoder, platformGeocoder } from './platformGeocoder';

function native() {
  return {
    reverseAsync: jest.fn().mockResolvedValue([{ street: 'Sample Road', city: 'Sample Town' }]),
    forwardAsync: jest.fn().mockResolvedValue([{ lat: 31.5, lng: 74.3 }]),
  };
}

describe('platform geocoder adapter', () => {
  it('passes coordinates to the native lookup and returns its addresses', async () => {
    const module = native();
    const result = await createPlatformGeocoder(module).reverse({ lat: 31.5, lng: 74.3 });
    expect(module.reverseAsync).toHaveBeenCalledWith(31.5, 74.3);
    expect(result).toEqual([{ street: 'Sample Road', city: 'Sample Town' }]);
  });

  it('passes an address to the native lookup and returns its coordinates', async () => {
    const module = native();
    const result = await createPlatformGeocoder(module).forward('Sample Road');
    expect(module.forwardAsync).toHaveBeenCalledWith('Sample Road');
    expect(result).toEqual([{ lat: 31.5, lng: 74.3 }]);
  });

  it('lets a native failure through, so the lookup is retried later', async () => {
    const module = native();
    module.reverseAsync.mockRejectedValue(new Error('The address lookup could not be completed'));
    const geocoder = createGeocoder(createPlatformGeocoder(module));
    expect(await geocoder.addressFor({ lat: 31.5, lng: 74.3 })).toEqual({ kind: 'retry' });
  });

  it('asks to retry, without crashing, in a build that has no native module', async () => {
    const geocoder = createGeocoder(createPlatformGeocoder(null));
    expect(await geocoder.addressFor({ lat: 31.5, lng: 74.3 })).toEqual({ kind: 'retry' });
    expect(await geocoder.coordinatesFor('Sample Road')).toEqual({ kind: 'retry' });
  });

  it('loads in tests, where the native module is absent', async () => {
    await expect(platformGeocoder.forward('Sample Road')).rejects.toThrow(/not available/i);
  });
});
