// T031: duplicate detection within 100 m for the same person (R3.5).
import { createPlace, softDeleteMemory } from '../../db/memories';
import { createPerson } from '../../db/people';
import { freshDb } from '../../db/testing/freshDb';
import { findNearbyPlace } from './findNearby';

const HOME = { lat: 31.5204, lng: 74.3587 };
// One degree of latitude is about 111,195 m.
const metresNorth = (metres: number) => ({ lat: HOME.lat + metres / 111_195, lng: HOME.lng });

async function setup() {
  const db = await freshDb();
  const ahmed = await createPerson(db, { name: 'Ahmed' });
  const sara = await createPerson(db, { name: 'Sara' });
  const home = await createPlace(db, { personId: ahmed.id, title: 'Home', ...HOME });
  return { db, ahmed, sara, home };
}

describe('findNearbyPlace', () => {
  it("offers the person's existing place when the new pin is within 100 m", async () => {
    const { db, ahmed, home } = await setup();
    const found = await findNearbyPlace(db, ahmed.id, metresNorth(99));
    expect(found?.place.id).toBe(home.id);
    expect(found?.distanceMeters).toBeGreaterThan(98);
    expect(found?.distanceMeters).toBeLessThan(100);
  });

  it('does not offer a place 101 m away', async () => {
    const { db, ahmed } = await setup();
    expect(await findNearbyPlace(db, ahmed.id, metresNorth(101))).toBeNull();
  });

  it("does not offer another person's place at the same spot", async () => {
    const { db, sara } = await setup();
    expect(await findNearbyPlace(db, sara.id, HOME)).toBeNull();
  });

  it('offers the closest place when several are near', async () => {
    const { db, ahmed } = await setup();
    const closer = await createPlace(db, { personId: ahmed.id, title: 'Gate', ...metresNorth(40) });
    const found = await findNearbyPlace(db, ahmed.id, metresNorth(50));
    expect(found?.place.id).toBe(closer.id);
  });

  it('ignores deleted places and places without coordinates', async () => {
    const { db, ahmed, home } = await setup();
    await softDeleteMemory(db, home.id);
    await createPlace(db, { personId: ahmed.id, title: 'Office', address: 'Sample Road' });
    expect(await findNearbyPlace(db, ahmed.id, HOME)).toBeNull();
  });
});
