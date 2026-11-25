// Where a pair of coordinates was read from.
export type LocationSource = 'google_maps' | 'apple_maps' | 'geo_uri' | 'plain_coordinates';

// Result of reading shared text (design.md, "Link parser rules").
export type ParsedLocation =
  // Coordinates were read directly. `snapshot` marks a live-location share (R2.5).
  | { kind: 'coordinates'; lat: number; lng: number; source: LocationSource; snapshot: boolean }
  // A short link whose redirect must be followed by the network module (R2.2).
  | { kind: 'needs_resolve'; url: string }
  // No coordinates, but text that may be an address; the caller tries an address lookup (R2.4).
  | { kind: 'text'; text: string }
  // Nothing usable (R1.4).
  | { kind: 'not_found' };
