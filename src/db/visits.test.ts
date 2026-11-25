import { createPlace } from './memories';
import { freshDb } from './testing/freshDb';
import { addVisit, listVisits } from './visits';

describe('visits data access', () => {
  it('records visits and lists them newest first', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    await addVisit(db, { memoryId: place.id, visitedAt: 1000, source: 'manual' });
    await addVisit(db, {
      memoryId: place.id,
      visitedAt: 3000,
      source: 'navigate_confirm',
      note: 'Eid dinner',
    });
    await addVisit(db, { memoryId: place.id, visitedAt: 2000, source: 'manual' });
    const visits = await listVisits(db, place.id);
    expect(visits.map((v) => v.visitedAt)).toEqual([3000, 2000, 1000]);
    expect(visits[0]).toMatchObject({ note: 'Eid dinner', source: 'navigate_confirm' });
  });

  it('defaults the visit time to now', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    const before = Date.now();
    const visit = await addVisit(db, { memoryId: place.id, source: 'manual' });
    expect(visit.visitedAt).toBeGreaterThanOrEqual(before);
    expect(visit.note).toBeNull();
  });
});
