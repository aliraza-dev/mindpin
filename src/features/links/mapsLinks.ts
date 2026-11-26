// Building map links for a saved place. Pure: no network and no platform imports.

// The parts of a place that locate it. A saved Memory fits this shape.
export type Locatable = {
  title: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
};

// Six decimals is about 10 cm, with no trailing zeros.
function formatCoordinate(value: number): string {
  return String(Number(value.toFixed(6)));
}

// "lat,lng", or null when the place has no coordinates.
export function coordinatePair(place: Locatable): string | null {
  if (place.lat === null || place.lng === null) return null;
  return `${formatCoordinate(place.lat)},${formatCoordinate(place.lng)}`;
}

// A link that opens on any phone or computer: the Google Maps app when installed, otherwise the
// browser. Uses the coordinates when known, otherwise the address. Null when there is neither.
export function webMapsLink(place: Locatable): string | null {
  const query = coordinatePair(place) ?? place.address?.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
