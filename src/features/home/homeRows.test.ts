// The people list on the home screen: who is listed first and what each row says.
import type { Memory } from '../../db/memories';
import type { Person } from '../../db/people';
import type { PlaceSummary } from '../../db/placeSummaries';
import { initI18n } from '../../i18n';
import { greetingFor, personRowSubtitle, summarizePeople } from './homeRows';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const person = (id: string, name: string, updatedAt = 0): Person => ({
  id,
  name,
  phone: null,
  contactRef: null,
  photoUri: null,
  color: null,
  createdAt: updatedAt,
  updatedAt,
});

const summary = (
  personId: string | null,
  title: string,
  savedDaysAgo: number,
  visitedDaysAgo: number | null,
): PlaceSummary => ({
  place: {
    id: `${personId}-${title}`,
    personId,
    title,
    createdAt: NOW - savedDaysAgo * DAY,
  } as Memory,
  personName: null,
  lastVisitedAt: visitedDaysAgo === null ? null : NOW - visitedDaysAgo * DAY,
});

describe('greetingFor', () => {
  it('follows the time of day', () => {
    expect(greetingFor(6)).toBe('morning');
    expect(greetingFor(11)).toBe('morning');
    expect(greetingFor(12)).toBe('afternoon');
    expect(greetingFor(16)).toBe('afternoon');
    expect(greetingFor(17)).toBe('evening');
    expect(greetingFor(2)).toBe('evening');
  });
});

describe('summarizePeople', () => {
  const people = [
    person('a', 'Ahmed'),
    person('s', 'Sara'),
    person('u', 'Usman'),
    person('n', 'New', NOW),
  ];
  const places = [
    summary('a', 'Shop', 2, null),
    summary('a', 'Home', 300, 60),
    summary('s', 'Office', 200, 21),
    summary('u', 'New flat', 30, null),
    summary(null, 'Clinic', 1, null),
  ];

  it('gives each person their places, in the order saved, and their latest save and visit', () => {
    const rows = summarizePeople(people, places);
    const ahmed = rows.find((r) => r.person.id === 'a');
    expect(ahmed).toMatchObject({
      placeLabels: ['Home', 'Shop'],
      lastSavedAt: NOW - 2 * DAY,
      lastVisitedAt: NOW - 60 * DAY,
    });
    expect(rows.find((r) => r.person.id === 'n')).toMatchObject({
      placeLabels: [],
      lastSavedAt: null,
    });
  });

  it('lists the most recently active person first', () => {
    expect(summarizePeople(people, places).map((r) => r.person.name)).toEqual([
      'New',
      'Ahmed',
      'Sara',
      'Usman',
    ]);
  });
});

describe('personRowSubtitle', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  const rowFor = (id: string, places: PlaceSummary[]) =>
    summarizePeople([person(id, 'Sample')], places)[0];

  // The three rows drawn in the Home frame.
  it('says "saved" when the latest thing was a save', () => {
    const row = rowFor('a', [summary('a', 'Shop', 2, null), summary('a', 'Home', 300, 60)]);
    expect(personRowSubtitle(row, NOW)).toBe('Home · Shop — saved 2 days ago');
  });

  it('says "visited" when the latest thing was a visit', () => {
    const row = rowFor('s', [summary('s', 'Office', 200, 21)]);
    expect(personRowSubtitle(row, NOW)).toBe('Office — visited 3 weeks ago');
  });

  it('says "not visited yet" when none of the places has been visited', () => {
    const row = rowFor('u', [summary('u', 'New flat', 30, null)]);
    expect(personRowSubtitle(row, NOW)).toBe('New flat — not visited yet');
  });

  it('says so when the person has no places', () => {
    expect(personRowSubtitle(rowFor('n', []), NOW)).toBe('No places yet');
  });
});
