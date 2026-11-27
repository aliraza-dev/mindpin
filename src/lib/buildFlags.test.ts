import { readMapsAvailable, readSkipSignIn } from './buildFlags';

describe('SKIP_SIGN_IN build flag (R7.1)', () => {
  it('is off when the app config does not set it', () => {
    expect(readSkipSignIn(undefined)).toBe(false);
    expect(readSkipSignIn({})).toBe(false);
  });

  it('is on only when the app config sets it to exactly true', () => {
    expect(readSkipSignIn({ skipSignIn: true })).toBe(true);
    expect(readSkipSignIn({ skipSignIn: 'true' })).toBe(false);
    expect(readSkipSignIn({ skipSignIn: 1 })).toBe(false);
  });
});

describe('MAPS_AVAILABLE build flag (design.md: Maps)', () => {
  it('is on for Android only when the build was given a maps key', () => {
    expect(readMapsAvailable({ androidMapsKeySet: true }, 'android')).toBe(true);
    expect(readMapsAvailable({ androidMapsKeySet: false }, 'android')).toBe(false);
    expect(readMapsAvailable({}, 'android')).toBe(false);
    expect(readMapsAvailable(undefined, 'android')).toBe(false);
    expect(readMapsAvailable({ androidMapsKeySet: 'true' }, 'android')).toBe(false);
  });

  it('is on for iOS, where Apple Maps needs no key', () => {
    expect(readMapsAvailable(undefined, 'ios')).toBe(true);
  });

  it('is off anywhere else', () => {
    expect(readMapsAvailable({ androidMapsKeySet: true }, 'web')).toBe(false);
  });
});
