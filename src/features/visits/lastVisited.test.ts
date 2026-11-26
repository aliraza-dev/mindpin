// T082: recording visits and showing when a place was last visited (R5.1, R5.3, R5.4).
import { createNote, createPlace, softDeleteMemory } from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import { listVisits } from '../../db/visits';
import { initI18n } from '../../i18n';
import { getLastVisit, lastVisitedLabel, recordVisit, relativeTime } from './lastVisited';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000_000;

describe('relativeTime', () => {
  it.each([
    [0, { unit: 'now' }],
    [59_000, { unit: 'now' }],
    [MINUTE, { unit: 'minute', count: 1 }],
    [59 * MINUTE, { unit: 'minute', count: 59 }],
    [HOUR, { unit: 'hour', count: 1 }],
    [23 * HOUR, { unit: 'hour', count: 23 }],
    [DAY, { unit: 'day', count: 1 }],
    [6 * DAY, { unit: 'day', count: 6 }],
    [7 * DAY, { unit: 'week', count: 1 }],
    [29 * DAY, { unit: 'week', count: 4 }],
    [30 * DAY, { unit: 'month', count: 1 }],
    [7 * 30 * DAY, { unit: 'month', count: 7 }],
    [364 * DAY, { unit: 'month', count: 12 }],
    [365 * DAY, { unit: 'year', count: 1 }],
    [800 * DAY, { unit: 'year', count: 2 }],
  ])('%d ms ago is %j', (ago, expected) => {
    expect(relativeTime(NOW - ago, NOW)).toEqual(expected);
  });

  it('treats a time in the future as now', () => {
    expect(relativeTime(NOW + HOUR, NOW)).toEqual({ unit: 'now' });
  });
});

describe('lastVisitedLabel (R5.3)', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  const label = (ago: number | null) => lastVisitedLabel(ago === null ? null : NOW - ago, NOW);

  it('says "Not visited yet" for a place with no visits', () => {
    expect(label(null)).toBe('Not visited yet');
  });

  it('shows the last visit as relative time, with correct plurals', () => {
    expect(label(0)).toBe('Last visited just now');
    expect(label(MINUTE)).toBe('Last visited 1 minute ago');
    expect(label(5 * HOUR)).toBe('Last visited 5 hours ago');
    expect(label(DAY)).toBe('Last visited 1 day ago');
    expect(label(21 * DAY)).toBe('Last visited 3 weeks ago');
    expect(label(7 * 30 * DAY)).toBe('Last visited 7 months ago');
    expect(label(400 * DAY)).toBe('Last visited 1 year ago');
  });
});

describe('recordVisit (R5.1, R5.4)', () => {
  it('records a visit with the current date and time', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    const before = Date.now();
    const visit = await recordVisit(db, place.id, { source: 'manual' });
    expect(visit.visitedAt).toBeGreaterThanOrEqual(before);
    expect(visit.visitedAt).toBeLessThanOrEqual(Date.now());
    expect(visit).toMatchObject({ memoryId: place.id, source: 'manual', note: null });
  });

  it('keeps the optional note as one line', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    const visit = await recordVisit(db, place.id, { source: 'manual', note: '  Eid dinner\n with family ' });
    expect(visit.note).toBe('Eid dinner with family');
    const blank = await recordVisit(db, place.id, { source: 'manual', note: ' \n ' });
    expect(blank.note).toBeNull();
  });

  it('lists past visits newest first and finds the last one', async () => {
    const db = await freshDb();
    const place = await createPlace(db, { title: 'Home' });
    expect(await getLastVisit(db, place.id)).toBeNull();
    await recordVisit(db, place.id, { source: 'manual', visitedAt: 1000 });
    await recordVisit(db, place.id, { source: 'navigate_confirm', visitedAt: 3000, note: 'Dinner' });
    await recordVisit(db, place.id, { source: 'manual', visitedAt: 2000 });
    expect((await listVisits(db, place.id)).map((v) => v.visitedAt)).toEqual([3000, 2000, 1000]);
    expect(await getLastVisit(db, place.id)).toMatchObject({ visitedAt: 3000, note: 'Dinner' });
  });

  it('refuses a visit to something that is not a saved place', async () => {
    const db = await freshDb();
    const note = await createNote(db, { title: 'Note', notes: 'Note' });
    const deleted = await createPlace(db, { title: 'Old flat' });
    await softDeleteMemory(db, deleted.id);
    for (const id of ['missing', note.id, deleted.id]) {
      await expect(recordVisit(db, id, { source: 'manual' })).rejects.toThrow(/place not found/i);
    }
  });
});
