// The save service (R1.3). It writes the place first, in one transaction with its person, and
// only then starts network lookups, which the caller never has to wait for (R1.5,
// constitution IV). Anything a lookup could not finish stays pending for the retry queue.
import {
  createPlace,
  getMemory,
  updateMemory,
  type Memory,
  type MemoryStatus,
} from '../../db/memories';
import type { Person } from '../../db/people';
import { inTransaction } from '../../db/transaction';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import type { ParsedLocation } from '../../parser/types';
import { resolvePersonChoice, type PersonChoice } from '../people/matchPerson';
import { processMemory, type LookupDeps } from '../resolve/retryQueue';

export type SavePlaceInput = {
  // What the parser made of the shared text.
  location: ParsedLocation;
  // An address already looked up while the sheet was open, or typed by the user (R1.4).
  address?: string | null;
  person: PersonChoice;
  // Home, Office, Shop, or a custom label (R4.1).
  label: string;
  notes?: string | null;
  tags?: string[];
  sourceApp?: string | null;
  // The original shared text, kept for re-parsing.
  sourceRaw?: string | null;
  // Set when the user chose to update a nearby place instead of adding a duplicate (R3.5).
  updatePlaceId?: string;
};

export type SavePlaceResult = {
  // The place as written, before any lookup has filled in more.
  place: Memory;
  person: Person | null;
  // Settles when the after-save lookups have run. It never rejects, and saving does not wait
  // for it.
  lookups: Promise<void>;
};

type LocationFields = {
  lat: number | null;
  lng: number | null;
  address: string | null;
  status: MemoryStatus;
  sourceRaw: string | null;
};

function locationFields(input: SavePlaceInput): LocationFields {
  const { location } = input;
  const address = input.address?.trim() || null;
  const sourceRaw = input.sourceRaw ?? null;

  switch (location.kind) {
    case 'coordinates':
      return {
        lat: location.lat,
        lng: location.lng,
        address,
        status: address ? 'resolved' : 'pending_geocode',
        sourceRaw,
      };
    case 'needs_resolve':
      return {
        lat: null,
        lng: null,
        address,
        status: 'pending_resolve',
        // The retry queue re-reads the link from the saved text, so the link must be in it.
        sourceRaw: sourceRaw?.includes(location.url) ? sourceRaw : location.url,
      };
    case 'text':
      return {
        lat: null,
        lng: null,
        address: address ?? location.text,
        status: 'pending_geocode',
        sourceRaw,
      };
    case 'not_found':
      if (!address) throw new Error('A place needs a location or an address');
      return { lat: null, lng: null, address, status: 'pending_geocode', sourceRaw };
  }
}

export async function savePlace(
  db: SqlDatabase,
  input: SavePlaceInput,
  deps: LookupDeps,
): Promise<SavePlaceResult> {
  const title = input.label.trim();
  if (!title) throw new Error('A place needs a label');
  const location = locationFields(input);

  const { place, person } = await inTransaction(db, async () => {
    const chosen = await resolvePersonChoice(db, input.person);

    if (input.updatePlaceId) {
      const existing = await getMemory(db, input.updatePlaceId);
      if (!existing || existing.type !== 'place' || existing.deletedAt !== null) {
        throw new Error('Place not found');
      }
      // The pin has moved, so the old address goes too unless a new one was given;
      // the lookup below fills it in. Notes and tags stay unless new ones were given.
      const updated = await updateMemory(db, existing.id, {
        ...location,
        title,
        personId: chosen?.id ?? existing.personId,
        notes: input.notes,
        tags: input.tags,
        sourceApp: input.sourceApp ?? existing.sourceApp,
        sourceRaw: location.sourceRaw ?? existing.sourceRaw,
      });
      return { place: updated, person: chosen };
    }

    const created = await createPlace(db, {
      ...location,
      title,
      personId: chosen?.id ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      sourceApp: input.sourceApp ?? null,
    });
    return { place: created, person: chosen };
  });

  const lookups =
    place.status === 'resolved'
      ? Promise.resolve()
      : processMemory(db, place.id, deps).then(
          () => undefined,
          () => logEvent('lookup_failed'),
        );

  return { place, person, lookups };
}
