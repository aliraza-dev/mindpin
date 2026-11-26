// Finishes lookups that could not run when a place was saved: short links waiting to be
// resolved (R1.5, R2.2) and address or coordinate lookups (R2.3, R2.4). A place is always saved
// first; this only fills in what the network can add later.
import {
  getMemory,
  listPendingPlaces,
  saveLookupResult,
  type MemoryStatus,
} from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import { watchOnline } from '../../lib/network';
import { parseShared } from '../../parser/parseShared';
import type { Geocoder } from '../geocode/geocode';
import type { ResolveOutcome } from './resolveShortLink';

export type LookupDeps = {
  resolveLink: (url: string) => Promise<ResolveOutcome>;
  geocoder: Geocoder;
};

async function resolveFromSource(sourceRaw: string | null, deps: LookupDeps): Promise<ResolveOutcome> {
  const parsed = parseShared(sourceRaw ?? '');
  if (parsed.kind === 'needs_resolve') return deps.resolveLink(parsed.url);
  if (parsed.kind === 'coordinates') return { kind: 'coordinates', lat: parsed.lat, lng: parsed.lng };
  if (parsed.kind === 'text') return parsed;
  return { kind: 'unresolvable' };
}

// Runs the pending lookups for one place and returns its status afterwards
// (null when the place does not exist).
export async function processMemory(
  db: SqlDatabase,
  id: string,
  deps: LookupDeps,
): Promise<MemoryStatus | null> {
  const memory = await getMemory(db, id);
  if (!memory) return null;
  if (memory.deletedAt !== null || memory.status === 'resolved') return memory.status;

  let { lat, lng, address } = memory;
  let status: MemoryStatus = memory.status;

  if (status === 'pending_resolve') {
    const outcome = await resolveFromSource(memory.sourceRaw, deps);
    if (outcome.kind === 'retry') return status;
    if (outcome.kind === 'coordinates') {
      lat = outcome.lat;
      lng = outcome.lng;
    } else if (outcome.kind === 'text') {
      address = address || outcome.text;
    }
    // The link has told us all it can; what is left is an address or coordinate lookup.
    status = 'pending_geocode';
  }

  if (lat !== null && lng !== null) {
    status = 'resolved';
    if (!address) {
      const found = await deps.geocoder.addressFor({ lat, lng });
      if (found.kind === 'found') address = found.value;
      else if (found.kind === 'retry') status = 'pending_geocode';
    }
  } else if (address) {
    const found = await deps.geocoder.coordinatesFor(address);
    if (found.kind === 'found') {
      lat = found.value.lat;
      lng = found.value.lng;
    }
    status = found.kind === 'retry' ? 'pending_geocode' : 'resolved';
  } else {
    status = 'resolved';
  }

  const changed =
    status !== memory.status ||
    lat !== memory.lat ||
    lng !== memory.lng ||
    address !== memory.address;
  if (changed) await saveLookupResult(db, id, { lat, lng, address, status });
  return status;
}

// Tries every pending place once. Returns how many are still waiting.
export async function processPending(db: SqlDatabase, deps: LookupDeps): Promise<number> {
  let stillPending = 0;
  for (const memory of await listPendingPlaces(db)) {
    try {
      const status = await processMemory(db, memory.id, deps);
      if (status !== null && status !== 'resolved') stillPending++;
    } catch {
      stillPending++;
      logEvent('lookup_failed');
    }
  }
  return stillPending;
}

type Watch = (onOnline: () => void) => { remove: () => void };

// Runs a pass now and another each time the device comes online. Passes never overlap:
// online events that arrive during a pass are answered by one more pass after it.
export function startRetryQueue(db: SqlDatabase, deps: LookupDeps, watch: Watch = watchOnline) {
  let running: Promise<void> | null = null;
  let again = false;
  let stopped = false;

  const run = () => {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    running = (async () => {
      do {
        again = false;
        try {
          await processPending(db, deps);
        } catch {
          logEvent('lookup_pass_failed');
        }
      } while (again && !stopped);
    })().finally(() => {
      running = null;
    });
  };

  const watcher = watch(run);
  run();

  return {
    stop() {
      stopped = true;
      watcher.remove();
    },
    whenIdle: (): Promise<void> => running ?? Promise.resolve(),
  };
}
