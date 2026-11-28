// T028 (queue part): pending lookups are finished on the next connection (R1.5, R2.2 to R2.4).
import { createPlace, getMemory, softDeleteMemory, updateMemory } from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import type { SqlDatabase } from '../../db/types';
import type { Geocoder } from '../geocode/geocode';
import { processMemory, processPending, startRetryQueue, type LookupDeps } from './retryQueue';

const SHORT = 'https://maps.app.goo.gl/AbC123';

function makeDeps(overrides: { resolveLink?: jest.Mock; geocoder?: Partial<Geocoder> } = {}) {
  const geocoder = {
    addressFor: jest.fn().mockResolvedValue({ kind: 'none' }),
    coordinatesFor: jest.fn().mockResolvedValue({ kind: 'none' }),
    ...overrides.geocoder,
  };
  const resolveLink = overrides.resolveLink ?? jest.fn().mockResolvedValue({ kind: 'retry' });
  const deps: LookupDeps = { resolveLink, geocoder };
  return { deps, resolveLink, geocoder };
}

function pendingLink(db: SqlDatabase) {
  return createPlace(db, {
    title: 'Shop',
    sourceRaw: `New shop ${SHORT}`,
    status: 'pending_resolve',
  });
}

describe('processMemory', () => {
  it('resolves a short link, then looks up its address (R2.2, R2.3)', async () => {
    const db = await freshDb();
    const place = await pendingLink(db);
    const { deps, resolveLink, geocoder } = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'coordinates', lat: 31.5, lng: 74.3 }),
      geocoder: {
        addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Sample Road' }),
      },
    });

    expect(await processMemory(db, place.id, deps)).toBe('resolved');
    expect(resolveLink).toHaveBeenCalledWith(SHORT);
    expect(geocoder.addressFor).toHaveBeenCalledWith({ lat: 31.5, lng: 74.3 });
    expect(await getMemory(db, place.id)).toMatchObject({
      lat: 31.5,
      lng: 74.3,
      address: 'Sample Road',
      status: 'resolved',
    });
  });

  it('leaves the place pending_resolve while offline, without losing it (R1.5)', async () => {
    const db = await freshDb();
    const place = await pendingLink(db);
    const { deps, geocoder } = makeDeps();

    expect(await processMemory(db, place.id, deps)).toBe('pending_resolve');
    expect(await getMemory(db, place.id)).toEqual(place);
    expect(geocoder.addressFor).not.toHaveBeenCalled();
  });

  it('keeps resolved coordinates and waits for the address when that lookup cannot run', async () => {
    const db = await freshDb();
    const place = await pendingLink(db);
    const { deps } = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'coordinates', lat: 31.5, lng: 74.3 }),
      geocoder: { addressFor: jest.fn().mockResolvedValue({ kind: 'retry' }) },
    });

    expect(await processMemory(db, place.id, deps)).toBe('pending_geocode');
    expect(await getMemory(db, place.id)).toMatchObject({
      lat: 31.5,
      lng: 74.3,
      address: null,
      status: 'pending_geocode',
    });
  });

  it('uses a place name from the resolved link as the address and looks up coordinates', async () => {
    const db = await freshDb();
    const place = await pendingLink(db);
    const { deps, geocoder } = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'text', text: 'Corner Shop, Sample Town' }),
      geocoder: {
        coordinatesFor: jest
          .fn()
          .mockResolvedValue({ kind: 'found', value: { lat: 1.5, lng: 2.5 } }),
      },
    });

    expect(await processMemory(db, place.id, deps)).toBe('resolved');
    expect(geocoder.coordinatesFor).toHaveBeenCalledWith('Corner Shop, Sample Town');
    expect(await getMemory(db, place.id)).toMatchObject({
      lat: 1.5,
      lng: 2.5,
      address: 'Corner Shop, Sample Town',
      status: 'resolved',
    });
  });

  it('stops retrying a dead link and keeps the original shared text', async () => {
    const db = await freshDb();
    const place = await pendingLink(db);
    const { deps } = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'unresolvable' }),
    });

    expect(await processMemory(db, place.id, deps)).toBe('resolved');
    expect(await getMemory(db, place.id)).toMatchObject({
      lat: null,
      lng: null,
      sourceRaw: `New shop ${SHORT}`,
      status: 'resolved',
    });
  });

  it('fills in the address for a place saved with coordinates only (R2.3)', async () => {
    const db = await freshDb();
    const place = await createPlace(db, {
      title: 'Home',
      lat: 31.5,
      lng: 74.3,
      status: 'pending_geocode',
    });
    const { deps, resolveLink } = makeDeps({
      geocoder: {
        addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Sample Road' }),
      },
    });

    expect(await processMemory(db, place.id, deps)).toBe('resolved');
    expect(await getMemory(db, place.id)).toMatchObject({
      address: 'Sample Road',
      status: 'resolved',
    });
    expect(resolveLink).not.toHaveBeenCalled();
  });

  it('keeps an address as text when no coordinates match (R2.4)', async () => {
    const db = await freshDb();
    const place = await createPlace(db, {
      title: 'Home',
      address: 'House 22, Sample Street',
      status: 'pending_geocode',
    });
    const { deps } = makeDeps();

    expect(await processMemory(db, place.id, deps)).toBe('resolved');
    expect(await getMemory(db, place.id)).toMatchObject({
      lat: null,
      lng: null,
      address: 'House 22, Sample Street',
      status: 'resolved',
    });
  });

  it('keeps an address-only place pending while the lookup cannot run', async () => {
    const db = await freshDb();
    const place = await createPlace(db, {
      title: 'Home',
      address: 'House 22, Sample Street',
      status: 'pending_geocode',
    });
    const { deps } = makeDeps({
      geocoder: { coordinatesFor: jest.fn().mockResolvedValue({ kind: 'retry' }) },
    });

    expect(await processMemory(db, place.id, deps)).toBe('pending_geocode');
    expect(await getMemory(db, place.id)).toEqual(place);
  });

  it('does not overwrite an address the user typed while the lookup was running', async () => {
    const db = await freshDb();
    const place = await createPlace(db, {
      title: 'Home',
      lat: 31.5,
      lng: 74.3,
      status: 'pending_geocode',
    });
    const { deps } = makeDeps({
      geocoder: {
        addressFor: jest.fn(async () => {
          await updateMemory(db, place.id, { address: 'Typed by the user', notes: 'Ring twice' });
          return { kind: 'found' as const, value: 'From the lookup' };
        }),
      },
    });

    await processMemory(db, place.id, deps);
    expect(await getMemory(db, place.id)).toMatchObject({
      address: 'Typed by the user',
      notes: 'Ring twice',
      status: 'resolved',
    });
  });

  it('skips places that are resolved, deleted, or missing', async () => {
    const db = await freshDb();
    const done = await createPlace(db, { title: 'Home', lat: 1, lng: 2 });
    const deleted = await pendingLink(db);
    await softDeleteMemory(db, deleted.id);
    const { deps, resolveLink, geocoder } = makeDeps();

    expect(await processMemory(db, done.id, deps)).toBe('resolved');
    expect(await processMemory(db, deleted.id, deps)).toBe('pending_resolve');
    expect(await processMemory(db, 'missing', deps)).toBeNull();
    expect(resolveLink).not.toHaveBeenCalled();
    expect(geocoder.addressFor).not.toHaveBeenCalled();
  });
});

describe('processPending', () => {
  it('works through every pending place and reports how many are still waiting', async () => {
    const db = await freshDb();
    const link = await pendingLink(db);
    const address = await createPlace(db, {
      title: 'Home',
      address: 'Sample Street',
      status: 'pending_geocode',
    });
    await createPlace(db, { title: 'Done', lat: 1, lng: 2 });
    const { deps, resolveLink } = makeDeps({
      geocoder: {
        coordinatesFor: jest.fn().mockResolvedValue({ kind: 'found', value: { lat: 5, lng: 6 } }),
      },
    });

    expect(await processPending(db, deps)).toBe(1);
    expect(resolveLink).toHaveBeenCalledTimes(1);
    expect((await getMemory(db, link.id))?.status).toBe('pending_resolve');
    expect(await getMemory(db, address.id)).toMatchObject({ lat: 5, lng: 6, status: 'resolved' });
  });

  it('carries on when one lookup throws', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const db = await freshDb();
    await pendingLink(db);
    const second = await createPlace(db, {
      title: 'Home',
      lat: 1,
      lng: 2,
      status: 'pending_geocode',
    });
    const { deps } = makeDeps({
      resolveLink: jest.fn().mockRejectedValue(new Error('boom')),
      geocoder: {
        addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Sample Road' }),
      },
    });

    expect(await processPending(db, deps)).toBe(1);
    expect((await getMemory(db, second.id))?.status).toBe('resolved');
    // The failure is logged by event name only, never with the place's details.
    expect(info).toHaveBeenCalledWith('[mindpin]', 'lookup_failed', {});
    info.mockRestore();
  });
});

describe('startRetryQueue', () => {
  function fakeWatch() {
    let onOnline: () => void = () => {};
    const remove = jest.fn();
    return {
      watch: (callback: () => void) => {
        onOnline = callback;
        return { remove };
      },
      goOnline: () => onOnline(),
      remove,
    };
  }

  it('runs at start and again each time the device comes online (R1.5)', async () => {
    const db = await freshDb();
    const place = await pendingLink(db);
    const resolveLink = jest
      .fn()
      .mockResolvedValueOnce({ kind: 'retry' })
      .mockResolvedValueOnce({ kind: 'coordinates', lat: 31.5, lng: 74.3 });
    const { deps } = makeDeps({ resolveLink });
    const network = fakeWatch();

    const queue = startRetryQueue(db, deps, network.watch);
    await queue.whenIdle();
    expect((await getMemory(db, place.id))?.status).toBe('pending_resolve');

    network.goOnline();
    await queue.whenIdle();
    expect(await getMemory(db, place.id)).toMatchObject({
      lat: 31.5,
      lng: 74.3,
      status: 'resolved',
    });
  });

  it('never runs two passes at once', async () => {
    const db = await freshDb();
    await pendingLink(db);
    let release: (value: { kind: 'retry' }) => void = () => {};
    const resolveLink = jest
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))
      .mockResolvedValue({ kind: 'retry' });
    const { deps } = makeDeps({ resolveLink });
    const network = fakeWatch();

    const queue = startRetryQueue(db, deps, network.watch);
    await new Promise((resolve) => setImmediate(resolve));
    network.goOnline();
    network.goOnline();
    expect(resolveLink).toHaveBeenCalledTimes(1);

    release({ kind: 'retry' });
    await queue.whenIdle();
    // The two online events during the first pass are answered by one more pass.
    expect(resolveLink).toHaveBeenCalledTimes(2);
  });

  it('stops listening and running when stopped', async () => {
    const db = await freshDb();
    await pendingLink(db);
    const { deps, resolveLink } = makeDeps();
    const network = fakeWatch();

    const queue = startRetryQueue(db, deps, network.watch);
    await queue.whenIdle();
    queue.stop();
    network.goOnline();
    await queue.whenIdle();
    expect(network.remove).toHaveBeenCalled();
    expect(resolveLink).toHaveBeenCalledTimes(1);
  });
});
