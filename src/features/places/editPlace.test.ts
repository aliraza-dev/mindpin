// T054: editing and deleting a place (R4.4, R4.9, R4.10).
import { createNote, createPlace, getMemory, listNotesForPlace, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { searchMemories } from '../../db/search';
import { freshDb } from '../../db/testing/freshDb';
import { addVisit } from '../../db/visits';
import type { Geocoder } from '../geocode/geocode';
import type { LookupDeps } from '../resolve/retryQueue';
import { deletePlace, saveEditedPlace } from './editPlace';
import type { PlaceFormValues } from './placeForm';

function makeDeps(geocoder: Partial<Geocoder> = {}) {
  const full = {
    addressFor: jest.fn().mockResolvedValue({ kind: 'none' }),
    coordinatesFor: jest.fn().mockResolvedValue({ kind: 'none' }),
    ...geocoder,
  };
  const deps: LookupDeps = { resolveLink: jest.fn().mockResolvedValue({ kind: 'retry' }), geocoder: full };
  return { deps, geocoder: full };
}

function values(overrides: Partial<PlaceFormValues> = {}): PlaceFormValues {
  return { label: 'Home', address: 'House 22, Sample Street', notes: '', tagsText: '', ...overrides };
}

async function seeded() {
  const db = await freshDb();
  const person = await createPerson(db, { name: 'Sample Person' });
  const place = await createPlace(db, {
    personId: person.id,
    title: 'Home',
    address: 'House 22, Sample Street',
    lat: 1.5,
    lng: 2.5,
    notes: 'White gate',
    tags: ['Gate code 4471'],
  });
  return { db, person, place };
}

describe('saveEditedPlace (R4.10)', () => {
  it('changes the label, address, notes, and tags', async () => {
    const { db, place } = await seeded();
    const { deps } = makeDeps();
    const result = await saveEditedPlace(
      db,
      place.id,
      values({ label: 'Farmhouse', address: 'Canal Road', notes: 'Blue door', tagsText: 'Parking, Floor 2' }),
      deps,
    );

    expect(result.ok).toBe(true);
    expect(await getMemory(db, place.id)).toMatchObject({
      title: 'Farmhouse',
      address: 'Canal Road',
      notes: 'Blue door',
      tags: ['Parking', 'Floor 2'],
    });
  });

  it('keeps the pin and looks nothing up when the address of a pinned place changes', async () => {
    const { db, place } = await seeded();
    const { deps, geocoder } = makeDeps();
    const result = await saveEditedPlace(db, place.id, values({ address: 'A corrected address' }), deps);
    if (result.ok) await result.lookups;

    expect(await getMemory(db, place.id)).toMatchObject({ lat: 1.5, lng: 2.5, status: 'resolved' });
    expect(geocoder.coordinatesFor).not.toHaveBeenCalled();
    expect(geocoder.addressFor).not.toHaveBeenCalled();
  });

  it('looks up the location again when the address of a place with no pin changes', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Shop', address: 'Old Road' });
    const { deps, geocoder } = makeDeps({
      coordinatesFor: jest.fn().mockResolvedValue({ kind: 'found', value: { lat: 3, lng: 4 } }),
    });
    const result = await saveEditedPlace(db, place.id, values({ label: 'Shop', address: 'New Road' }), deps);
    if (result.ok) await result.lookups;

    expect(geocoder.coordinatesFor).toHaveBeenCalledWith('New Road');
    expect(await getMemory(db, place.id)).toMatchObject({ address: 'New Road', lat: 3, lng: 4, status: 'resolved' });
  });

  it('leaves the lookup waiting when the phone is offline', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Shop', address: 'Old Road' });
    const { deps } = makeDeps({ coordinatesFor: jest.fn().mockResolvedValue({ kind: 'retry' }) });
    const result = await saveEditedPlace(db, place.id, values({ label: 'Shop', address: 'New Road' }), deps);
    if (result.ok) await result.lookups;

    expect(await getMemory(db, place.id)).toMatchObject({ address: 'New Road', lat: null, status: 'pending_geocode' });
  });

  it('does not look anything up when the address of a place with no pin is unchanged', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Shop', address: 'Old Road' });
    const { deps, geocoder } = makeDeps();
    const result = await saveEditedPlace(db, place.id, values({ label: 'Store', address: 'Old Road' }), deps);
    if (result.ok) await result.lookups;

    expect(geocoder.coordinatesFor).not.toHaveBeenCalled();
    expect(await getMemory(db, place.id)).toMatchObject({ title: 'Store', status: 'resolved' });
  });

  it('looks up the address again from the pin when the address is cleared', async () => {
    const { db, place } = await seeded();
    const { deps, geocoder } = makeDeps({
      addressFor: jest.fn().mockResolvedValue({ kind: 'found', value: 'Looked-up Street' }),
    });
    const result = await saveEditedPlace(db, place.id, values({ address: '' }), deps);
    if (result.ok) await result.lookups;

    expect(geocoder.addressFor).toHaveBeenCalledWith({ lat: 1.5, lng: 2.5 });
    expect(await getMemory(db, place.id)).toMatchObject({ address: 'Looked-up Street', lat: 1.5, status: 'resolved' });
  });

  it('writes nothing when the form is not valid', async () => {
    const { db, place } = await seeded();
    const { deps } = makeDeps();
    const result = await saveEditedPlace(db, place.id, values({ label: ' ' }), deps);

    expect(result).toEqual({ ok: false, errors: { label: 'labelRequired' } });
    expect(await getMemory(db, place.id)).toMatchObject({ title: 'Home', updatedAt: place.updatedAt });
  });

  it('keeps the person, the source, and the day it was saved', async () => {
    const { db, person, place } = await seeded();
    const { deps } = makeDeps();
    await saveEditedPlace(db, place.id, values({ label: 'Office' }), deps);

    expect(await getMemory(db, place.id)).toMatchObject({ personId: person.id, createdAt: place.createdAt });
  });

  it('makes the new words findable and the old ones not (R6.1)', async () => {
    const { db, place } = await seeded();
    const { deps } = makeDeps();
    await saveEditedPlace(db, place.id, values({ label: 'Farmhouse', notes: 'Blue door', tagsText: 'Orchard' }), deps);

    expect((await searchMemories(db, 'orchard')).map((r) => r.memory.id)).toEqual([place.id]);
    expect((await searchMemories(db, 'farmhouse')).map((r) => r.memory.id)).toEqual([place.id]);
    expect(await searchMemories(db, '4471')).toEqual([]);
  });

  it('refuses a missing place, a deleted place, and a note', async () => {
    const { db, place } = await seeded();
    const { deps } = makeDeps();
    const note = await createNote(db, { title: 'Note', notes: 'Note' });
    await softDeleteMemory(db, place.id);

    for (const id of [place.id, note.id, '3f2504e0-4f89-41d3-9a0c-0305e82c3301']) {
      await expect(saveEditedPlace(db, id, values(), deps)).rejects.toThrow('Place not found');
    }
  });
});

describe('deletePlace (R4.9)', () => {
  it('removes the place from lists and search', async () => {
    const { db, place } = await seeded();
    expect(await deletePlace(db, place.id)).toBe(true);

    expect((await getMemory(db, place.id))?.deletedAt).not.toBeNull();
    expect(await searchMemories(db, 'sample')).toEqual([]);
  });

  it('keeps the notes linked to it, without the link', async () => {
    const { db, person, place } = await seeded();
    const note = await createNote(db, {
      title: 'Wi-Fi',
      notes: 'Wi-Fi\nNetwork name',
      personId: person.id,
      placeId: place.id,
    });
    await deletePlace(db, place.id);

    expect(await getMemory(db, note.id)).toMatchObject({
      placeId: null,
      personId: person.id,
      deletedAt: null,
      notes: 'Wi-Fi\nNetwork name',
    });
    expect(await listNotesForPlace(db, place.id)).toEqual([]);
  });

  it('leaves other places and their notes alone', async () => {
    const { db, place } = await seeded();
    const other = await createPlace(db, { title: 'Shop', address: 'Other Road' });
    const otherNote = await createNote(db, { title: 'Hours', notes: 'Hours', placeId: other.id });
    await addVisit(db, { memoryId: other.id, source: 'manual' });
    await deletePlace(db, place.id);

    expect((await getMemory(db, other.id))?.deletedAt).toBeNull();
    expect((await getMemory(db, otherNote.id))?.placeId).toBe(other.id);
  });

  it('does nothing for a missing place, a place already deleted, or a note', async () => {
    const { db, place } = await seeded();
    const note = await createNote(db, { title: 'Note', notes: 'Note' });
    await deletePlace(db, place.id);

    expect(await deletePlace(db, place.id)).toBe(false);
    expect(await deletePlace(db, note.id)).toBe(false);
    expect(await deletePlace(db, '3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(false);
    expect((await getMemory(db, note.id))?.deletedAt).toBeNull();
  });
});
