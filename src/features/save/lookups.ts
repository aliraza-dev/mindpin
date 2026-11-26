// The real network lookups used on a phone, and the background queue that finishes them.
import { getDatabase } from '../../db/database';
import type { SqlDatabase } from '../../db/types';
import { logEvent } from '../../lib/log';
import { createGeocoder } from '../geocode/geocode';
import { platformGeocoder } from '../geocode/platformGeocoder';
import { resolveShortLink } from '../resolve/resolveShortLink';
import { startRetryQueue, type LookupDeps } from '../resolve/retryQueue';

export const deviceLookups: LookupDeps = {
  resolveLink: (url) => resolveShortLink(url),
  geocoder: createGeocoder(platformGeocoder),
};

type BackgroundOptions = {
  openDatabase?: () => Promise<SqlDatabase>;
  deps?: LookupDeps;
  watch?: Parameters<typeof startRetryQueue>[2];
};

// Called once when the app opens. Finishes lookups left pending by earlier saves, now and each
// time the device comes back online (R1.5). A database that cannot open is logged by event
// name only and never crashes the app.
export function startBackgroundLookups(options: BackgroundOptions = {}) {
  const { openDatabase = getDatabase, deps = deviceLookups, watch } = options;
  let stopped = false;
  let queue: ReturnType<typeof startRetryQueue> | undefined;

  const opening = openDatabase().then(
    (db) => {
      if (!stopped) queue = startRetryQueue(db, deps, watch);
    },
    () => logEvent('database_open_failed'),
  );

  return {
    stop() {
      stopped = true;
      queue?.stop();
    },
    async whenIdle(): Promise<void> {
      await opening;
      await queue?.whenIdle();
    },
  };
}
