// Address lookup (R2.3) and coordinate lookup (R2.4) on top of the platform geocoder.
// This module never logs what it looks up (constitution II).
import { isValidCoordinates, type Coordinates } from '../../lib/geo';

// "retry" means the lookup could not be asked (offline or unavailable), so try again later.
// "none" means it was asked and there is no match, so do not try again.
export type Lookup<T> = { kind: 'found'; value: T } | { kind: 'none' } | { kind: 'retry' };

export type PlatformAddress = {
  formattedAddress?: string | null;
  name?: string | null;
  streetNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
};

// What the phone must provide (Android Geocoder, iOS CLGeocoder). A rejected promise means the
// lookup could not run; an empty list means no match.
export interface PlatformGeocoder {
  reverse(coordinates: Coordinates): Promise<PlatformAddress[]>;
  forward(address: string): Promise<Coordinates[]>;
}

export interface Geocoder {
  addressFor(coordinates: Coordinates): Promise<Lookup<string>>;
  coordinatesFor(address: string): Promise<Lookup<Coordinates>>;
}

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function formatAddress(address: PlatformAddress): string | null {
  const formatted = clean(address.formattedAddress);
  if (formatted) return formatted;

  const street = [clean(address.streetNumber), clean(address.street)].filter(Boolean).join(' ');
  const parts: string[] = [];
  for (const part of [
    street || clean(address.name),
    address.district,
    address.city,
    address.region,
  ]) {
    const text = clean(part);
    if (text && !parts.some((p) => p.toLowerCase() === text.toLowerCase())) parts.push(text);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

export function createGeocoder(platform: PlatformGeocoder): Geocoder {
  return {
    async addressFor(coordinates) {
      if (!isValidCoordinates(coordinates)) return { kind: 'none' };
      let results: PlatformAddress[];
      try {
        results = await platform.reverse(coordinates);
      } catch {
        return { kind: 'retry' };
      }
      for (const result of results) {
        const value = formatAddress(result);
        if (value) return { kind: 'found', value };
      }
      return { kind: 'none' };
    },

    async coordinatesFor(address) {
      const query = address.trim();
      if (!query) return { kind: 'none' };
      let results: Coordinates[];
      try {
        results = await platform.forward(query);
      } catch {
        return { kind: 'retry' };
      }
      const value = results.find(isValidCoordinates);
      return value
        ? { kind: 'found', value: { lat: value.lat, lng: value.lng } }
        : { kind: 'none' };
    },
  };
}
