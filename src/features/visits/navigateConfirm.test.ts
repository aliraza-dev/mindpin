// T084: "Did you visit?" after Navigate (R5.2).
import { createPlace, softDeleteMemory } from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import { listVisits } from '../../db/visits';
import { answerNavigatePrompt, getNavigatePrompt, rememberNavigate } from './navigateConfirm';

const MINUTE = 60_000;
const T0 = 1_800_000_000_000;

async function setup() {
  const db = await freshDb();
  const place = await createPlace(db, { title: 'Shop' });
  return { db, place };
}

describe('the question after Navigate', () => {
  it('is asked the next time the app opens, at least 15 minutes later', async () => {
    const { db, place } = await setup();
    await rememberNavigate(db, place.id, T0);
    // Coming straight back, for example to read a gate code, does not ask yet.
    expect(await getNavigatePrompt(db, T0 + 14 * MINUTE)).toBeNull();
    expect(await getNavigatePrompt(db, T0 + 15 * MINUTE)).toMatchObject({
      place: { id: place.id, title: 'Shop' },
      navigatedAt: T0,
    });
  });

  it('records the visit, dated at the time of Navigate, when the user confirms', async () => {
    const { db, place } = await setup();
    await rememberNavigate(db, place.id, T0);
    const visit = await answerNavigatePrompt(db, true);
    expect(visit).toMatchObject({ memoryId: place.id, visitedAt: T0, source: 'navigate_confirm' });
    expect(await listVisits(db, place.id)).toHaveLength(1);
    // Asked once only.
    expect(await getNavigatePrompt(db, T0 + 60 * MINUTE)).toBeNull();
  });

  it('records nothing when the user says no, and does not ask again', async () => {
    const { db, place } = await setup();
    await rememberNavigate(db, place.id, T0);
    expect(await answerNavigatePrompt(db, false)).toBeNull();
    expect(await listVisits(db, place.id)).toEqual([]);
    expect(await getNavigatePrompt(db, T0 + 60 * MINUTE)).toBeNull();
  });

  it('remembers only the latest Navigate', async () => {
    const { db, place } = await setup();
    const other = await createPlace(db, { title: 'Office' });
    await rememberNavigate(db, place.id, T0);
    await rememberNavigate(db, other.id, T0 + 5 * MINUTE);
    expect(await getNavigatePrompt(db, T0 + 60 * MINUTE)).toMatchObject({
      place: { id: other.id },
      navigatedAt: T0 + 5 * MINUTE,
    });
  });

  it('drops the question when the place has been deleted', async () => {
    const { db, place } = await setup();
    await rememberNavigate(db, place.id, T0);
    await softDeleteMemory(db, place.id);
    expect(await getNavigatePrompt(db, T0 + 60 * MINUTE)).toBeNull();
    expect(await answerNavigatePrompt(db, true)).toBeNull();
    expect(await listVisits(db, place.id)).toEqual([]);
  });

  it('has nothing to ask or record when Navigate was never used', async () => {
    const { db } = await setup();
    expect(await getNavigatePrompt(db, T0)).toBeNull();
    expect(await answerNavigatePrompt(db, true)).toBeNull();
  });
});
