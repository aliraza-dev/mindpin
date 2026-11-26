// Address lookup through the phone's own service (Android Geocoder, iOS CLGeocoder).
// Neither needs the location permission, which is why this module exists (design.md).
import { requireOptionalNativeModule } from 'expo';

export type NativeAddress = {
  formattedAddress?: string | null;
  name?: string | null;
  streetNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
};

export type NativeCoordinates = { lat: number; lng: number };

export type PlaceGeocoderNativeModule = {
  // Both resolve with an empty list when there is no match, and reject when the lookup could
  // not run (offline, service unavailable). Error messages never contain what was looked up.
  reverseAsync(latitude: number, longitude: number): Promise<NativeAddress[]>;
  forwardAsync(address: string): Promise<NativeCoordinates[]>;
};

// Null where the native code is not in the build: Expo Go, tests, and web.
export const PlaceGeocoderNative =
  requireOptionalNativeModule<PlaceGeocoderNativeModule>('PlaceGeocoder');
