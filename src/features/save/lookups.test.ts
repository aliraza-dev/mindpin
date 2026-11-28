// T139: the retry queue is started when the app opens (R1.5).
import { createPlace, getMemory } from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import type { SqlDatabase } from '../../db/types';
import type { LookupDeps } from '../resolve/retryQueue';
import { deviceLookups, startBackgroundLookups } from './lookups';

function makeDeps(): LookupDeps {
  return {
    resolveLink: jest.fn().mockResolvedValue({ kind: 'retry' }),
    geocoder: {
      addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Sample Road' }),
      coordinatesFor: jest.fn().mockResolvedValue({ kind: 'none' }),
    },
  };
}

describe('startBackgroundLookups', () => {
  it('opens the database and finishes lookups left pending by earlier saves', async () => {
    const db = await freshDb();
    const place = await createPlace(db, {
      title: 'Home',
      lat: 1,
      lng: 2,
      status: 'pending_geocode',
    });
    const watch = jest.fn(() => ({ remove: jest.fn() }));

    const background = startBackgroundLookups({
      openDatabase: async () => db,
      deps: makeDeps(),
      watch,
    });
    await background.whenIdle();

    expect(await getMemory(db, place.id)).toMatchObject({
      address: 'Sample Road',
      status: 'resolved',
    });
    expect(watch).toHaveBeenCalledTimes(1);
    background.stop();
  });

  it('does not start if it is stopped before the database has opened', async () => {
    const db = await freshDb();
    await createPlace(db, { title: 'Home', lat: 1, lng: 2, status: 'pending_geocode' });
    let open: (db: SqlDatabase) => void = () => {};
    const deps = makeDeps();
    const watch = jest.fn(() => ({ remove: jest.fn() }));

    const background = startBackgroundLookups({
      openDatabase: () => new Promise((resolve) => (open = resolve)),
      deps,
      watch,
    });
    background.stop();
    open(db);
    await background.whenIdle();

    expect(watch).not.toHaveBeenCalled();
    expect(deps.geocoder.addressFor).not.toHaveBeenCalled();
  });

  it('logs by event name only, and does not throw, when the database cannot open', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const background = startBackgroundLookups({
      openDatabase: () => Promise.reject(new Error('disk problem')),
      deps: makeDeps(),
    });
    await expect(background.whenIdle()).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledWith('[mindpin]', 'database_open_failed', {});
    info.mockRestore();
  });
});

describe('deviceLookups', () => {
  it('asks to retry address lookups in a build without the native module', async () => {
    expect(await deviceLookups.geocoder.addressFor({ lat: 1, lng: 2 })).toEqual({ kind: 'retry' });
  });
});
