// What the save sheet can show before Save is tapped: the pin behind a short link (R2.2) and
// the address of a pin (R2.3). Saving never waits for this; whatever is still missing when the
// user taps Save is finished afterwards by the save service and the retry queue (R1.5).
import type { ParsedLocation } from '../../parser/types';
import type { LookupDeps } from '../resolve/retryQueue';

export type Preview = {
  // The location as far as it is known now; a resolved short link becomes its pin.
  location: ParsedLocation;
  address: string | null;
  // True when a lookup could not run and will be tried again after saving.
  waiting: boolean;
};

async function forPin(
  location: Extract<ParsedLocation, { kind: 'coordinates' }>,
  deps: LookupDeps,
): Promise<Preview> {
  const found = await deps.geocoder.addressFor({ lat: location.lat, lng: location.lng });
  return {
    location,
    address: found.kind === 'found' ? found.value : null,
    waiting: found.kind === 'retry',
  };
}

async function look(parsed: ParsedLocation, deps: LookupDeps): Promise<Preview> {
  switch (parsed.kind) {
    case 'coordinates':
      return forPin(parsed, deps);
    case 'needs_resolve': {
      const outcome = await deps.resolveLink(parsed.url);
      if (outcome.kind === 'retry') return { location: parsed, address: null, waiting: true };
      if (outcome.kind === 'unresolvable') {
        return { location: { kind: 'not_found' }, address: null, waiting: false };
      }
      if (outcome.kind === 'text') {
        return { location: outcome, address: outcome.text, waiting: false };
      }
      // Only known map links are ever resolved, so the pin came from a map link.
      const pin = { ...outcome, source: 'google_maps' as const, snapshot: false };
      return forPin(pin, deps);
    }
    case 'text':
      return { location: parsed, address: parsed.text, waiting: false };
    case 'not_found':
      return { location: parsed, address: null, waiting: false };
  }
}

// Never rejects: a lookup that fails is simply left for later.
export async function previewShared(parsed: ParsedLocation, deps: LookupDeps): Promise<Preview> {
  try {
    return await look(parsed, deps);
  } catch {
    return {
      location: parsed,
      address: parsed.kind === 'text' ? parsed.text : null,
      waiting: true,
    };
  }
}
