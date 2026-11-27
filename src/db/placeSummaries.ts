// Places as lists show them: with the person's name and the time of the last visit.
import { toMemory, type Memory, type MemoryRow } from './memories';
import type { SqlDatabase } from './types';

export type PlaceSummary = {
  place: Memory;
  personName: string | null;
  lastVisitedAt: number | null;
};

// Saved places, newest first: one person's when an id is given, otherwise all of them.
export async function listPlaceSummaries(
  db: SqlDatabase,
  personId?: string,
): Promise<PlaceSummary[]> {
  const rows = await db.getAllAsync<
    MemoryRow & { person_name: string | null; last_visited_at: number | null }
  >(
    `SELECT m.*, p.name AS person_name, max(v.visited_at) AS last_visited_at
     FROM memory m
     LEFT JOIN visit v ON v.memory_id = m.id
     LEFT JOIN person p ON p.id = m.person_id
     WHERE m.type = 'place' AND m.deleted_at IS NULL
       AND (? IS NULL OR m.person_id = ?)
     GROUP BY m.id
     ORDER BY m.created_at DESC, m.rowid DESC`,
    [personId ?? null, personId ?? null],
  );
  return rows.map((row) => ({
    place: toMemory(row),
    personName: row.person_name,
    lastVisitedAt: row.last_visited_at,
  }));
}
