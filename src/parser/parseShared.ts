// Pure link parser: no network, no UI, no platform imports (constitution V).
// Rules follow the parser table in docs/spec/design.md.
import type { LocationSource, ParsedLocation } from './types';

type Coordinates = { lat: number; lng: number };
type LinkResult =
  | { kind: 'coordinates'; coords: Coordinates; source: LocationSource }
  | { kind: 'needs_resolve'; url: string }
  | { kind: 'text'; text: string }
  | null;

const NUMBER = '(-?\\d{1,3}(?:\\.\\d+)?)';
const PAIR = new RegExp(`^(?:loc:)?\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*$`);
const PAIR_WITH_LABEL = new RegExp(`^${NUMBER}\\s*,\\s*${NUMBER}\\s*(?:\\(.*\\))?\\s*$`);
const GOOGLE_PIN = new RegExp(`!3d${NUMBER}!4d${NUMBER}`);
const GOOGLE_VIEW = new RegExp(`@${NUMBER},${NUMBER}`);
const GOOGLE_HOST = /^(?:www\.|maps\.)?google\.[a-z.]{2,6}$/;
const LINK = /(?:https?:\/\/|geo:)[^\s<>"]+/gi;

// Plain text needs decimals on both numbers, so "Floor 2, 3 rooms" is not a location.
const DECIMAL = '(-?\\d{1,3}\\.\\d+)';
const PLAIN = new RegExp(
  `(?:^|[^\\w.])${DECIMAL}(?!\\d)\\s*°?\\s*(?:([NS])\\b)?(?:\\s*[,;]\\s*|\\s+)${DECIMAL}(?!\\.?\\d)(?:\\s*°?\\s*([EW])\\b)?`,
  'gi',
);

function inRange(lat: number, lng: number): Coordinates | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function fromMatch(match: RegExpMatchArray | null): Coordinates | null {
  return match ? inRange(Number(match[1]), Number(match[2])) : null;
}

function decode(value: string): string {
  const spaced = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

function parseQuery(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const part of query.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = decode(eq === -1 ? part : part.slice(0, eq)).toLowerCase();
    if (!params.has(key)) params.set(key, eq === -1 ? '' : decode(part.slice(eq + 1)).trim());
  }
  return params;
}

function firstCoordinates(params: Map<string, string>, keys: string[]): Coordinates | null {
  for (const key of keys) {
    const coords = fromMatch((params.get(key) ?? '').match(PAIR));
    if (coords) return coords;
  }
  return null;
}

function firstText(params: Map<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
}

// Links end where the sentence around them continues; drop that punctuation.
function trimLink(link: string): string {
  let end = link.length;
  while (end > 0) {
    const last = link[end - 1];
    const unbalancedParen =
      last === ')' && link.slice(0, end).split('(').length < link.slice(0, end).split(')').length;
    if ('.,;:!?\'"'.includes(last) || unbalancedParen) end--;
    else break;
  }
  return link.slice(0, end);
}

function parseGeo(link: string): LinkResult {
  const body = link.slice('geo:'.length);
  const queryStart = body.indexOf('?');
  const point = (queryStart === -1 ? body : body.slice(0, queryStart)).split(';')[0];
  const params = parseQuery(queryStart === -1 ? '' : body.slice(queryStart + 1));
  const q = params.get('q') ?? '';

  // Android convention: geo:0,0?q=lat,lng(Label) puts the pin at q.
  const fromQ = fromMatch(q.match(PAIR_WITH_LABEL));
  if (fromQ) return { kind: 'coordinates', coords: fromQ, source: 'geo_uri' };

  const [lat, lng] = point.split(',');
  const main = inRange(Number(lat), Number(lng));
  if (main && lat !== undefined && lng !== undefined && !(main.lat === 0 && main.lng === 0)) {
    return { kind: 'coordinates', coords: main, source: 'geo_uri' };
  }
  return q ? { kind: 'text', text: q } : null;
}

function parseHttp(link: string): LinkResult {
  const match = link.match(/^https?:\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?/i);
  if (!match) return null;
  const host = match[1].toLowerCase();
  const path = match[2];
  const params = parseQuery(match[3] ?? '');

  if (host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps'))) {
    return { kind: 'needs_resolve', url: link };
  }

  if (GOOGLE_HOST.test(host) && (host.startsWith('maps.') || path.startsWith('/maps'))) {
    // The exact pin, then an explicit coordinate parameter, then the map centre.
    const coords =
      fromMatch(path.match(GOOGLE_PIN)) ??
      firstCoordinates(params, ['q', 'query', 'll', 'destination', 'daddr', 'center']) ??
      fromMatch(path.match(GOOGLE_VIEW));
    if (coords) return { kind: 'coordinates', coords, source: 'google_maps' };
    const text = firstText(params, ['q', 'query', 'destination', 'daddr']);
    return text ? { kind: 'text', text } : null;
  }

  if (host === 'maps.apple.com') {
    const coords = firstCoordinates(params, ['ll', 'coordinate', 'sll', 'q', 'daddr']);
    if (coords) return { kind: 'coordinates', coords, source: 'apple_maps' };
    const text = firstText(params, ['address', 'q', 'daddr']);
    return text ? { kind: 'text', text } : null;
  }

  return null;
}

function parsePlain(text: string): Coordinates | null {
  for (const match of text.matchAll(PLAIN)) {
    let lat = Number(match[1]);
    let lng = Number(match[3]);
    if (match[2]) lat = match[2].toUpperCase() === 'S' ? -Math.abs(lat) : Math.abs(lat);
    if (match[4]) lng = match[4].toUpperCase() === 'W' ? -Math.abs(lng) : Math.abs(lng);
    const coords = inRange(lat, lng);
    if (coords) return coords;
  }
  return null;
}

// Order of preference: coordinates in a map link, a short link to resolve, plain coordinates
// in the text, an address inside a map link, then any remaining text.
export function parseShared(text: string): ParsedLocation {
  const links = (text.match(LINK) ?? []).map(trimLink);
  const results = links.map((link) =>
    link.toLowerCase().startsWith('geo:') ? parseGeo(link) : parseHttp(link),
  );

  for (const result of results) {
    if (result?.kind === 'coordinates') {
      return { kind: 'coordinates', ...result.coords, source: result.source, snapshot: false };
    }
  }
  for (const result of results) {
    if (result?.kind === 'needs_resolve') return result;
  }

  const rest = text.replace(LINK, ' ').replace(/\s+/g, ' ').trim();
  const plain = parsePlain(rest);
  if (plain) {
    return { kind: 'coordinates', ...plain, source: 'plain_coordinates', snapshot: false };
  }

  for (const result of results) {
    if (result?.kind === 'text') return result;
  }
  return rest ? { kind: 'text', text: rest } : { kind: 'not_found' };
}
