// Duplicate detection: has this person already got a place saved at this spot? (R3.5)
import { listPlacesForPerson, type Memory } from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { distanceMeters, type Coordinates } from '../../lib/geo';

const DUPLICATE_RADIUS_METERS = 100;

export type NearbyPlace = { place: Memory; distanceMeters: number };

// The person's closest saved place within 100 m of the new pin, or null.
// The caller offers to update it instead of adding a duplicate.
export async function findNearbyPlace(
  db: SqlDatabase,
  personId: string,
  pin: Coordinates,
  radiusMeters: number = DUPLICATE_RADIUS_METERS,
): Promise<NearbyPlace | null> {
  let nearest: NearbyPlace | null = null;
  for (const place of await listPlacesForPerson(db, personId)) {
    if (place.lat === null || place.lng === null) continue;
    const distance = distanceMeters(pin, { lat: place.lat, lng: place.lng });
    if (distance <= radiusMeters && (!nearest || distance < nearest.distanceMeters)) {
      nearest = { place, distanceMeters: distance };
    }
  }
  return nearest;
}
