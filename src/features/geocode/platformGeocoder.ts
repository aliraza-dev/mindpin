// Connects the lookup logic to the phone's address lookup (modules/place-geocoder).
import {
  PlaceGeocoderNative,
  type PlaceGeocoderNativeModule,
} from '../../../modules/place-geocoder';
import type { PlatformGeocoder } from './geocode';

function unavailable(): never {
  // Builds without the native module (Expo Go, tests). The caller treats this as "retry later".
  throw new Error('Address lookup is not available in this build');
}

export function createPlatformGeocoder(native: PlaceGeocoderNativeModule | null): PlatformGeocoder {
  return {
    async reverse({ lat, lng }) {
      if (!native) unavailable();
      return native.reverseAsync(lat, lng);
    },
    async forward(address) {
      if (!native) unavailable();
      return native.forwardAsync(address);
    },
  };
}

export const platformGeocoder = createPlatformGeocoder(PlaceGeocoderNative);
