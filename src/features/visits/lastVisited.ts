// Recording visits (R5.1) and showing when a place was last visited (R5.3, R5.4).
import { getMemory } from '../../db/memories';
import type { SqlDatabase } from '../../db/types';
import { addVisit, listVisits, type Visit, type VisitSource } from '../../db/visits';
import { translate, type Translate } from '../../i18n';

export type RelativeTime =
  | { unit: 'now' }
  | { unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'; count: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// How long ago something happened, in the largest unit that fits. A month is counted as 30
// days and a year as 365, which is exact enough for "7 months ago".
export function relativeTime(then: number, now: number): RelativeTime {
  const elapsed = now - then;
  if (elapsed < MINUTE) return { unit: 'now' };
  if (elapsed < HOUR) return { unit: 'minute', count: Math.floor(elapsed / MINUTE) };
  if (elapsed < DAY) return { unit: 'hour', count: Math.floor(elapsed / HOUR) };
  const days = Math.floor(elapsed / DAY);
  if (days < 7) return { unit: 'day', count: days };
  if (days < 30) return { unit: 'week', count: Math.floor(days / 7) };
  if (days < 365) return { unit: 'month', count: Math.floor(days / 30) };
  return { unit: 'year', count: Math.floor(days / 365) };
}

// "Last visited 2 months ago", or "Not visited yet" (R5.3). Text comes from the translations.
export function lastVisitedLabel(
  lastVisitedAt: number | null,
  now: number,
  t: Translate = translate,
): string {
  if (lastVisitedAt === null) return t('visits:notVisitedYet');
  return t('visits:lastVisited', { when: agoText(lastVisitedAt, now, t) });
}

// "2 months ago", or "just now". Text comes from the translations.
export function agoText(then: number, now: number, t: Translate = translate): string {
  const ago = relativeTime(then, now);
  return ago.unit === 'now'
    ? t('visits:ago.now')
    : t(`visits:ago.${ago.unit}`, { count: ago.count });
}

export async function getLastVisit(db: SqlDatabase, placeId: string): Promise<Visit | null> {
  return (await listVisits(db, placeId))[0] ?? null;
}

export type NewVisitOptions = { source: VisitSource; note?: string | null; visitedAt?: number };

// Records a visit to a saved place, now unless a time is given (R5.1). The optional note is
// kept as one line (R5.4).
export async function recordVisit(
  db: SqlDatabase,
  placeId: string,
  options: NewVisitOptions,
): Promise<Visit> {
  const place = await getMemory(db, placeId);
  if (!place || place.type !== 'place' || place.deletedAt !== null) {
    throw new Error('Place not found');
  }
  const note = (options.note ?? '').replace(/\s+/g, ' ').trim() || null;
  return addVisit(db, {
    memoryId: placeId,
    source: options.source,
    visitedAt: options.visitedAt,
    note,
  });
}
