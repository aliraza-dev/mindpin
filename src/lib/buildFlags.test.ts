import { readSkipSignIn } from './buildFlags';

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
