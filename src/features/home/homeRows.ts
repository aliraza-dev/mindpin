// What the home screen's people list shows. Pure: the screen supplies the data and the time.
import type { Person } from '../../db/people';
import type { PlaceSummary } from '../../db/placeSummaries';
import { translate, type Translate } from '../../i18n';
import { agoText } from '../visits/lastVisited';

export type Greeting = 'morning' | 'afternoon' | 'evening';

// Morning until noon, afternoon until 5 pm, evening otherwise (the small hours count as evening).
export function greetingFor(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export type PersonRow = {
  person: Person;
  // Labels of the person's places in the order they were saved, as the Home frame lists them.
  placeLabels: string[];
  lastSavedAt: number | null;
  lastVisitedAt: number | null;
};

function lastActivity(row: PersonRow): number {
  return Math.max(row.person.updatedAt, row.lastSavedAt ?? 0, row.lastVisitedAt ?? 0);
}

// One row per person, the most recently active first. `places` are newest first, as
// listPlaceSummaries returns them.
export function summarizePeople(people: Person[], places: PlaceSummary[]): PersonRow[] {
  const rows = new Map<string, PersonRow>();
  for (const person of people) {
    rows.set(person.id, { person, placeLabels: [], lastSavedAt: null, lastVisitedAt: null });
  }
  for (const { place, lastVisitedAt } of places) {
    const row = place.personId ? rows.get(place.personId) : undefined;
    if (!row) continue;
    row.placeLabels.unshift(place.title);
    row.lastSavedAt = Math.max(row.lastSavedAt ?? 0, place.createdAt);
    if (lastVisitedAt !== null) row.lastVisitedAt = Math.max(row.lastVisitedAt ?? 0, lastVisitedAt);
  }
  return [...rows.values()].sort((a, b) => lastActivity(b) - lastActivity(a));
}

// The second line of a person's row, following the three examples in the Home frame:
// "Home · Shop — saved 2 days ago", "Office — visited 3 weeks ago", "New flat — not visited yet".
// It names the person's places, then the latest thing that happened: a visit or a save. A person
// with no visits at all reads "not visited yet".
export function personRowSubtitle(row: PersonRow, now: number, t: Translate = translate): string {
  if (row.placeLabels.length === 0 || row.lastSavedAt === null) return t('home:noPlacesYet');
  const labels = row.placeLabels.join(' · ');
  let status: string;
  if (row.lastVisitedAt === null) status = t('home:notVisitedYet');
  else if (row.lastVisitedAt >= row.lastSavedAt) {
    status = t('home:visited', { when: agoText(row.lastVisitedAt, now, t) });
  } else {
    status = t('home:saved', { when: agoText(row.lastSavedAt, now, t) });
  }
  return `${labels} — ${status}`;
}
