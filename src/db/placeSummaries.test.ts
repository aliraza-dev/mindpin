import { createNote, createPlace, softDeleteMemory } from './memories';
import { createPerson } from './people';
import { listPlaceSummaries } from './placeSummaries';
import { freshDb } from './testing/freshDb';
import { addVisit } from './visits';

async function seeded() {
  let clock = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  const db = await freshDb();
  const ahmed = await createPerson(db, { name: 'Ahmed' });
  const home = await createPlace(db, { personId: ahmed.id, title: 'Home' });
  const shop = await createPlace(db, { personId: ahmed.id, title: 'Shop' });
  const loose = await createPlace(db, { title: 'Clinic' });
  const gone = await createPlace(db, { personId: ahmed.id, title: 'Old flat' });
  await softDeleteMemory(db, gone.id);
  await createNote(db, { title: 'Note', notes: 'Note', personId: ahmed.id });
  await addVisit(db, { memoryId: home.id, visitedAt: 500, source: 'manual' });
  await addVisit(db, { memoryId: home.id, visitedAt: 900, source: 'manual' });
  jest.restoreAllMocks();
  return { db, ahmed, home, shop, loose };
}

describe('listPlaceSummaries', () => {
  it("lists one person's places, newest first, each with its last visit", async () => {
    const { db, ahmed, home, shop } = await seeded();
    const summaries = await listPlaceSummaries(db, ahmed.id);
    expect(summaries.map((s) => [s.place.id, s.personName, s.lastVisitedAt])).toEqual([
      [shop.id, 'Ahmed', null],
      [home.id, 'Ahmed', 900],
    ]);
  });

  it('lists every saved place when no person is given, including ones without a person', async () => {
    const { db, home, shop, loose } = await seeded();
    const summaries = await listPlaceSummaries(db);
    expect(summaries.map((s) => s.place.id)).toEqual([loose.id, shop.id, home.id]);
    expect(summaries[0].personName).toBeNull();
  });
});
