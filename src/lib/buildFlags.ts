import Constants from 'expo-constants';
import { Platform } from 'react-native';

// R7.1: internal tester builds may skip sign-in; store builds never do.
// Only the literal boolean true counts, so a mistyped config value stays safe (off).
export function readSkipSignIn(extra: Record<string, unknown> | undefined): boolean {
  return extra?.skipSignIn === true;
}

export const SKIP_SIGN_IN = readSkipSignIn(Constants.expoConfig?.extra);

// The map (design.md: Maps). On Android it needs a Google Maps key given to the build
// (app.config.js); without one the app shows the address instead of a map. On iOS the map is
// Apple Maps, which needs no key. Only the literal boolean true counts.
export function readMapsAvailable(
  extra: Record<string, unknown> | undefined,
  platform: string,
): boolean {
  if (platform === 'ios') return true;
  return platform === 'android' && extra?.androidMapsKeySet === true;
}

export const MAPS_AVAILABLE = readMapsAvailable(Constants.expoConfig?.extra, Platform.OS);
