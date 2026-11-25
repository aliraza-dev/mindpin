import Constants from 'expo-constants';

// R7.1: internal tester builds may skip sign-in; store builds never do.
// Only the literal boolean true counts, so a mistyped config value stays safe (off).
export function readSkipSignIn(extra: Record<string, unknown> | undefined): boolean {
  return extra?.skipSignIn === true;
}

export const SKIP_SIGN_IN = readSkipSignIn(Constants.expoConfig?.extra);
