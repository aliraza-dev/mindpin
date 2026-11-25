import { newId } from '../lib/id';
import type { SqlDatabase } from './types';

export type VisitSource = 'manual' | 'navigate_confirm';

export type Visit = {
  id: string;
  memoryId: string;
  visitedAt: number;
  note: string | null;
  source: VisitSource;
};

export type NewVisit = {
  memoryId: string;
  source: VisitSource;
  visitedAt?: number;
  note?: string | null;
};

type VisitRow = {
  id: string;
  memory_id: string;
  visited_at: number;
  note: string | null;
  source: VisitSource;
};

export async function addVisit(db: SqlDatabase, input: NewVisit): Promise<Visit> {
  const visit: Visit = {
    id: newId(),
    memoryId: input.memoryId,
    visitedAt: input.visitedAt ?? Date.now(),
    note: input.note ?? null,
    source: input.source,
  };
  await db.runAsync(
    'INSERT INTO visit (id, memory_id, visited_at, note, source) VALUES (?, ?, ?, ?, ?)',
    [visit.id, visit.memoryId, visit.visitedAt, visit.note, visit.source],
  );
  return visit;
}

// Newest first (R5.4).
export async function listVisits(db: SqlDatabase, memoryId: string): Promise<Visit[]> {
  const rows = await db.getAllAsync<VisitRow>(
    'SELECT * FROM visit WHERE memory_id = ? ORDER BY visited_at DESC',
    [memoryId],
  );
  return rows.map((r) => ({
    id: r.id,
    memoryId: r.memory_id,
    visitedAt: r.visited_at,
    note: r.note,
    source: r.source,
  }));
}
