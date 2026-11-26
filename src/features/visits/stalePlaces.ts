// Places not visited in over 6 months, for the home screen card (R5.5).
import { toMemory, type Memory, type MemoryRow } from '../../db/memories';
import type { SqlDatabase } from '../../db/types';

export type StalePlace = {
  place: Memory;
  personName: string | null;
  // Null when the place has never been visited; it then counts from the day it was saved.
  lastVisitedAt: number | null;
};

const STALE_MONTHS = 6;
const STALE_LIMIT = 3;

// The same date and time of day, 6 calendar months earlier, in the phone's time zone.
function sixMonthsBefore(now: number): number {
  const date = new Date(now);
  date.setMonth(date.getMonth() - STALE_MONTHS);
  return date.getTime();
}

// Up to 3 places whose last visit (or, if never visited, the day they were saved) is more than
// 6 months ago, the longest unvisited first.
export async function findStalePlaces(
  db: SqlDatabase,
  now: number = Date.now(),
  limit: number = STALE_LIMIT,
): Promise<StalePlace[]> {
  const rows = await db.getAllAsync<
    MemoryRow & { person_name: string | null; last_visited_at: number | null }
  >(
    `SELECT m.*, p.name AS person_name, max(v.visited_at) AS last_visited_at
     FROM memory m
     LEFT JOIN visit v ON v.memory_id = m.id
     LEFT JOIN person p ON p.id = m.person_id
     WHERE m.type = 'place' AND m.deleted_at IS NULL
     GROUP BY m.id
     HAVING coalesce(max(v.visited_at), m.created_at) < ?
     ORDER BY coalesce(max(v.visited_at), m.created_at), m.rowid
     LIMIT ?`,
    [sixMonthsBefore(now), limit],
  );
  return rows.map((row) => ({
    place: toMemory(row),
    personName: row.person_name,
    lastVisitedAt: row.last_visited_at,
  }));
}
