// T032: the save service (R1.3, R1.4, R1.5, R2.3, R2.4, R3.5, R3.7, R3.11, R4.1; reliability).
import { createNote, createPlace, getMemory, softDeleteMemory } from '../../db/memories';
import { createPerson, listPeople } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import type { SqlDatabase } from '../../db/types';
import type { ParsedLocation } from '../../parser/types';
import type { Geocoder } from '../geocode/geocode';
import { processPending, type LookupDeps } from '../resolve/retryQueue';
import { savePlace, type SavePlaceInput } from './savePlace';

const SHORT = 'https://maps.app.goo.gl/AbC123';
const PIN: ParsedLocation = {
  kind: 'coordinates',
  lat: 31.5204,
  lng: 74.3587,
  source: 'google_maps',
  snapshot: false,
};

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

function input(overrides: Partial<SavePlaceInput> = {}): SavePlaceInput {
  return { location: PIN, address: 'Sample Road', person: { kind: 'none' }, label: 'Home', ...overrides };
}

async function countRows(db: SqlDatabase, table: 'memory' | 'person') {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT count(*) AS n FROM ${table}`);
  return row?.n ?? 0;
}

describe('savePlace', () => {
  it('stores the place with its person, label, notes, tags, and source (R1.3)', async () => {
    const db = await freshDb();
    const { deps, resolveLink, geocoder } = makeDeps();
    const result = await savePlace(
      db,
      input({
        person: {
          kind: 'contact',
          contact: { contactRef: 'c-1', name: 'Sample Person', phone: '+10000000000', photoUri: null },
        },
        label: ' Shop ',
        notes: 'Blue door',
        tags: ['parking'],
        sourceApp: 'WhatsApp',
        sourceRaw: 'https://maps.google.com/?q=31.5204,74.3587',
      }),
      deps,
    );
    await result.lookups;

    expect(result.person).toMatchObject({ name: 'Sample Person', contactRef: 'c-1' });
    expect(await getMemory(db, result.place.id)).toMatchObject({
      type: 'place',
      personId: result.person?.id,
      title: 'Shop',
      lat: 31.5204,
      lng: 74.3587,
      address: 'Sample Road',
      notes: 'Blue door',
      tags: ['parking'],
      sourceApp: 'WhatsApp',
      sourceRaw: 'https://maps.google.com/?q=31.5204,74.3587',
      status: 'resolved',
    });
    // Everything was already known, so nothing is looked up.
    expect(resolveLink).not.toHaveBeenCalled();
    expect(geocoder.addressFor).not.toHaveBeenCalled();
  });

  it('writes the person and the place together or not at all (reliability)', async () => {
    const db = await freshDb();
    const failing: SqlDatabase = {
      ...db,
      runAsync: (source, params) =>
        source.includes('INSERT INTO memory')
          ? Promise.reject(new Error('interrupted'))
          : db.runAsync(source, params),
    };
    await expect(
      savePlace(failing, input({ person: { kind: 'new', name: 'Sample Person' } }), makeDeps().deps),
    ).rejects.toThrow('interrupted');
    expect(await countRows(db, 'person')).toBe(0);
    expect(await countRows(db, 'memory')).toBe(0);
  });

  it('makes the saved place searchable straight away', async () => {
    const db = await freshDb();
    const result = await savePlace(
      db,
      input({ person: { kind: 'new', name: 'Sample Person' }, label: 'Workshop' }),
      makeDeps().deps,
    );
    const search = (query: string) =>
      db.getAllAsync<{ memory_id: string }>('SELECT memory_id FROM memory_fts WHERE memory_fts MATCH ?', [
        query,
      ]);
    expect(await search('workshop')).toEqual([{ memory_id: result.place.id }]);
    expect(await search('sample')).toEqual([{ memory_id: result.place.id }]);
  });

  it('writes before any network work and does not wait for it (R1.5, constitution IV)', async () => {
    const db = await freshDb();
    const order: string[] = [];
    const recording: SqlDatabase = {
      ...db,
      runAsync: (source, params) => {
        if (source.includes('INSERT INTO memory')) order.push('write');
        return db.runAsync(source, params);
      },
    };
    // A lookup that never finishes, like a request on a dead connection.
    const resolveLink = jest.fn(() => {
      order.push('network');
      return new Promise<never>(() => {});
    });
    const { deps } = makeDeps({ resolveLink });

    const result = await savePlace(
      recording,
      input({ location: { kind: 'needs_resolve', url: SHORT }, address: null, sourceRaw: `Shop ${SHORT}` }),
      deps,
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(order).toEqual(['write', 'network']);
    expect(await getMemory(db, result.place.id)).toMatchObject({
      status: 'pending_resolve',
      sourceRaw: `Shop ${SHORT}`,
      lat: null,
    });
  });

  it('saves a short link while offline and finishes it on the next connection (R1.5)', async () => {
    const db = await freshDb();
    const offline = makeDeps();
    const result = await savePlace(
      db,
      input({ location: { kind: 'needs_resolve', url: SHORT }, address: null }),
      offline.deps,
    );
    await result.lookups;
    // With no shared text passed in, the link itself is kept so it can be resolved later.
    expect(await getMemory(db, result.place.id)).toMatchObject({
      status: 'pending_resolve',
      sourceRaw: SHORT,
    });

    const online = makeDeps({
      resolveLink: jest.fn().mockResolvedValue({ kind: 'coordinates', lat: 1.5, lng: 2.5 }),
      geocoder: { addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Sample Road' }) },
    });
    expect(await processPending(db, online.deps)).toBe(0);
    expect(await getMemory(db, result.place.id)).toMatchObject({
      lat: 1.5,
      lng: 2.5,
      address: 'Sample Road',
      status: 'resolved',
    });
  });

  it('looks up the address after saving coordinates (R2.3)', async () => {
    const db = await freshDb();
    const { deps } = makeDeps({
      geocoder: { addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Sample Road' }) },
    });
    const result = await savePlace(db, input({ address: null }), deps);
    expect(result.place).toMatchObject({ address: null, status: 'pending_geocode' });
    await result.lookups;
    expect(await getMemory(db, result.place.id)).toMatchObject({
      address: 'Sample Road',
      status: 'resolved',
    });
  });

  it('saves an address-only share as text and looks up its coordinates (R2.4)', async () => {
    const db = await freshDb();
    const { deps, geocoder } = makeDeps({
      geocoder: {
        coordinatesFor: jest.fn().mockResolvedValue({ kind: 'found', value: { lat: 1.5, lng: 2.5 } }),
      },
    });
    const result = await savePlace(
      db,
      input({ location: { kind: 'text', text: 'House 22, Sample Street' }, address: undefined }),
      deps,
    );
    expect(result.place).toMatchObject({ address: 'House 22, Sample Street', lat: null });
    await result.lookups;
    expect(geocoder.coordinatesFor).toHaveBeenCalledWith('House 22, Sample Street');
    expect(await getMemory(db, result.place.id)).toMatchObject({ lat: 1.5, lng: 2.5, status: 'resolved' });
  });

  it('saves a typed address when the share had no location (R1.4)', async () => {
    const db = await freshDb();
    const { deps } = makeDeps();
    const result = await savePlace(
      db,
      input({ location: { kind: 'not_found' }, address: ' House 22 ', sourceRaw: 'come by Friday' }),
      deps,
    );
    await result.lookups;
    expect(await getMemory(db, result.place.id)).toMatchObject({
      address: 'House 22',
      lat: null,
      sourceRaw: 'come by Friday',
      status: 'resolved',
    });
  });

  it('refuses to save a place with neither a location nor an address', async () => {
    const db = await freshDb();
    await expect(
      savePlace(db, input({ location: { kind: 'not_found' }, address: '  ' }), makeDeps().deps),
    ).rejects.toThrow(/location or an address/i);
    expect(await countRows(db, 'memory')).toBe(0);
  });

  it('requires a label and writes nothing without one (R4.1)', async () => {
    const db = await freshDb();
    await expect(
      savePlace(db, input({ label: '   ', person: { kind: 'new', name: 'Sample' } }), makeDeps().deps),
    ).rejects.toThrow(/label/i);
    expect(await countRows(db, 'person')).toBe(0);
  });

  it('saves a place without a person (R3.11)', async () => {
    const db = await freshDb();
    const result = await savePlace(db, input(), makeDeps().deps);
    expect(result.person).toBeNull();
    expect(result.place.personId).toBeNull();
    expect(await listPeople(db)).toEqual([]);
  });

  it('reuses the person linked to a contact across saves (R3.7)', async () => {
    const db = await freshDb();
    const contact = { contactRef: 'c-1', name: 'Sample Person', phone: null, photoUri: null };
    const { deps } = makeDeps();
    const first = await savePlace(db, input({ person: { kind: 'contact', contact } }), deps);
    const second = await savePlace(db, input({ person: { kind: 'contact', contact }, label: 'Office' }), deps);
    expect(second.person?.id).toBe(first.person?.id);
    expect(await listPeople(db)).toHaveLength(1);
    expect(await countRows(db, 'memory')).toBe(2);
  });

  describe('updating the nearby place instead of adding a duplicate (R3.5)', () => {
    it('updates that place and keeps what was not changed', async () => {
      const db = await freshDb();
      const person = await createPerson(db, { name: 'Sample Person' });
      const existing = await createPlace(db, {
        personId: person.id,
        title: 'Home',
        lat: 31.52,
        lng: 74.35,
        address: 'Old address',
        notes: 'Gate code 1234',
        tags: ['floor 2'],
      });
      const { deps } = makeDeps({
        geocoder: { addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'New address' }) },
      });

      const result = await savePlace(
        db,
        input({
          address: null,
          person: { kind: 'existing', personId: person.id },
          label: 'New home',
          updatePlaceId: existing.id,
        }),
        deps,
      );
      await result.lookups;

      expect(result.place.id).toBe(existing.id);
      expect(await countRows(db, 'memory')).toBe(1);
      expect(await getMemory(db, existing.id)).toMatchObject({
        personId: person.id,
        title: 'New home',
        lat: 31.5204,
        lng: 74.3587,
        address: 'New address',
        notes: 'Gate code 1234',
        tags: ['floor 2'],
        status: 'resolved',
      });
    });

    it('refuses to update a place that is missing, deleted, or a note', async () => {
      const db = await freshDb();
      const deleted = await createPlace(db, { title: 'Home', lat: 1, lng: 2 });
      await softDeleteMemory(db, deleted.id);
      const note = await createNote(db, { title: 'Wi-Fi', notes: 'Wi-Fi' });
      const { deps } = makeDeps();
      for (const id of ['missing', deleted.id, note.id]) {
        await expect(savePlace(db, input({ updatePlaceId: id }), deps)).rejects.toThrow(/not found/i);
      }
      // The failed attempts wrote nothing new.
      expect(await countRows(db, 'memory')).toBe(2);
    });
  });

  it('never lets a failed lookup break the save', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const db = await freshDb();
    const { deps } = makeDeps({ resolveLink: jest.fn().mockRejectedValue(new Error('boom')) });
    const result = await savePlace(
      db,
      input({ location: { kind: 'needs_resolve', url: SHORT }, address: null }),
      deps,
    );
    await expect(result.lookups).resolves.toBeUndefined();
    expect((await getMemory(db, result.place.id))?.status).toBe('pending_resolve');
    expect(info).toHaveBeenCalledWith('[mindpin]', 'lookup_failed', {});
    info.mockRestore();
  });
});
