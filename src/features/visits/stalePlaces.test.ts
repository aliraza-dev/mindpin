// T083: places not visited in over 6 months, for the home screen card (R5.5).
import { createNote, createPlace, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import type { SqlDatabase } from '../../db/types';
import { addVisit } from '../../db/visits';
import { findStalePlaces } from './stalePlaces';

// Local dates, so the 6-calendar-month rule does not depend on the machine's time zone.
const on = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();
const NOW = on(2026, 11, 26);

async function placeSavedOn(
  db: SqlDatabase,
  title: string,
  savedAt: number,
  visits: number[] = [],
) {
  const place = await createPlace(db, { title });
  await db.runAsync('UPDATE memory SET created_at = ? WHERE id = ?', [savedAt, place.id]);
  for (const visitedAt of visits) {
    await addVisit(db, { memoryId: place.id, visitedAt, source: 'manual' });
  }
  return place;
}

const titles = async (db: SqlDatabase) =>
  (await findStalePlaces(db, NOW)).map((s) => s.place.title);

describe('findStalePlaces', () => {
  it('finds a place whose last visit was over 6 months ago', async () => {
    const db = await freshDb();
    await placeSavedOn(db, 'Over', on(2025, 1, 1), [on(2026, 5, 25)]);
    await placeSavedOn(db, 'Exactly six months', on(2025, 1, 1), [on(2026, 5, 26)]);
    await placeSavedOn(db, 'Recent', on(2025, 1, 1), [on(2026, 11, 1)]);
    expect(await titles(db)).toEqual(['Over']);
  });

  it('goes by the latest visit, not an older one', async () => {
    const db = await freshDb();
    await placeSavedOn(db, 'Visited again', on(2025, 1, 1), [on(2025, 2, 1), on(2026, 10, 1)]);
    expect(await titles(db)).toEqual([]);
  });

  it('counts a never-visited place only once it was saved over 6 months ago', async () => {
    const db = await freshDb();
    await placeSavedOn(db, 'Old and never visited', on(2026, 2, 1));
    await placeSavedOn(db, 'New and never visited', on(2026, 11, 20));
    const stale = await findStalePlaces(db, NOW);
    expect(stale.map((s) => s.place.title)).toEqual(['Old and never visited']);
    expect(stale[0].lastVisitedAt).toBeNull();
  });

  it('returns at most 3, the longest unvisited first, with the last visit and person', async () => {
    const db = await freshDb();
    const person = await createPerson(db, { name: 'Sample Person' });
    await placeSavedOn(db, 'B', on(2024, 1, 1), [on(2025, 6, 1)]);
    await placeSavedOn(db, 'D', on(2024, 1, 1), [on(2026, 3, 1)]);
    const a = await placeSavedOn(db, 'A', on(2024, 1, 1), [on(2025, 1, 1)]);
    await db.runAsync('UPDATE memory SET person_id = ? WHERE id = ?', [person.id, a.id]);
    await placeSavedOn(db, 'C', on(2025, 9, 1));

    const stale = await findStalePlaces(db, NOW);
    expect(stale.map((s) => s.place.title)).toEqual(['A', 'B', 'C']);
    expect(stale[0]).toMatchObject({ lastVisitedAt: on(2025, 1, 1), personName: 'Sample Person' });
    expect(stale[1].personName).toBeNull();
  });

  it('ignores deleted places and notes', async () => {
    const db = await freshDb();
    const deleted = await placeSavedOn(db, 'Deleted', on(2025, 1, 1));
    await softDeleteMemory(db, deleted.id);
    const note = await createNote(db, { title: 'Note', notes: 'Note' });
    await db.runAsync('UPDATE memory SET created_at = ? WHERE id = ?', [on(2025, 1, 1), note.id]);
    expect(await titles(db)).toEqual([]);
  });
});
