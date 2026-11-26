import { newId } from '../lib/id';
import type { SqlDatabase, SqlValue } from './types';

export type MemoryType = 'place' | 'note';
// pending_resolve: a short link is waiting for a connection.
// pending_geocode: an address or coordinates lookup is waiting for a connection.
export type MemoryStatus = 'resolved' | 'pending_resolve' | 'pending_geocode';

export type Memory = {
  id: string;
  type: MemoryType;
  personId: string | null;
  placeId: string | null;
  title: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  pinned: boolean;
  sourceApp: string | null;
  sourceRaw: string | null;
  status: MemoryStatus;
  payload: unknown;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type EditableFields = {
  personId?: string | null;
  placeId?: string | null;
  title?: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  notes?: string | null;
  tags?: string[];
  pinned?: boolean;
  sourceApp?: string | null;
  sourceRaw?: string | null;
  status?: MemoryStatus;
  payload?: unknown;
};

export type NewPlace = Omit<EditableFields, 'placeId' | 'pinned'> & { title: string };
export type NewNote = Pick<EditableFields, 'personId' | 'placeId' | 'pinned'> & {
  title: string;
  notes: string;
};

// A row as stored. Exported for other queries in the database layer, such as search.
export type MemoryRow = {
  id: string;
  type: MemoryType;
  person_id: string | null;
  place_id: string | null;
  title: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  notes: string | null;
  tags: string;
  pinned: number;
  source_app: string | null;
  source_raw: string | null;
  status: MemoryStatus;
  payload: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    type: row.type,
    personId: row.person_id,
    placeId: row.place_id,
    title: row.title,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    notes: row.notes,
    tags: JSON.parse(row.tags) as string[],
    pinned: row.pinned === 1,
    sourceApp: row.source_app,
    sourceRaw: row.source_raw,
    status: row.status,
    payload: row.payload === null ? null : (JSON.parse(row.payload) as unknown),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

const COLUMNS = [
  'id',
  'type',
  'person_id',
  'place_id',
  'title',
  'lat',
  'lng',
  'address',
  'notes',
  'tags',
  'pinned',
  'source_app',
  'source_raw',
  'status',
  'payload',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

function toValues(m: Memory): SqlValue[] {
  return [
    m.id,
    m.type,
    m.personId,
    m.placeId,
    m.title,
    m.lat,
    m.lng,
    m.address,
    m.notes,
    JSON.stringify(m.tags),
    m.pinned ? 1 : 0,
    m.sourceApp,
    m.sourceRaw,
    m.status,
    m.payload === null || m.payload === undefined ? null : JSON.stringify(m.payload),
    m.createdAt,
    m.updatedAt,
    m.deletedAt,
  ];
}

async function insert(db: SqlDatabase, type: MemoryType, fields: EditableFields): Promise<Memory> {
  const now = Date.now();
  const memory: Memory = {
    id: newId(),
    type,
    personId: fields.personId ?? null,
    placeId: fields.placeId ?? null,
    title: fields.title ?? '',
    lat: fields.lat ?? null,
    lng: fields.lng ?? null,
    address: fields.address ?? null,
    notes: fields.notes ?? null,
    tags: fields.tags ?? [],
    pinned: fields.pinned ?? false,
    sourceApp: fields.sourceApp ?? null,
    sourceRaw: fields.sourceRaw ?? null,
    status: fields.status ?? 'resolved',
    payload: fields.payload ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO memory (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`,
    toValues(memory),
  );
  return memory;
}

export function createPlace(db: SqlDatabase, input: NewPlace): Promise<Memory> {
  return insert(db, 'place', input);
}

export function createNote(db: SqlDatabase, input: NewNote): Promise<Memory> {
  return insert(db, 'note', input);
}

export async function getMemory(db: SqlDatabase, id: string): Promise<Memory | null> {
  const row = await db.getFirstAsync<MemoryRow>('SELECT * FROM memory WHERE id = ?', [id]);
  return row ? toMemory(row) : null;
}

export async function updateMemory(
  db: SqlDatabase,
  id: string,
  patch: EditableFields,
): Promise<Memory> {
  const existing = await getMemory(db, id);
  if (!existing) throw new Error('Memory not found');
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as EditableFields;
  const updated: Memory = {
    ...existing,
    ...defined,
    updatedAt: Math.max(Date.now(), existing.updatedAt),
  } as Memory;
  const assignments = COLUMNS.filter((c) => c !== 'id')
    .map((c) => `${c} = ?`)
    .join(', ');
  await db.runAsync(`UPDATE memory SET ${assignments} WHERE id = ?`, [
    ...toValues(updated).slice(1),
    id,
  ]);
  return updated;
}

// Soft delete keeps the row so backups can tell a deletion from a missing item (design.md).
export async function softDeleteMemory(db: SqlDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE memory SET deleted_at = ?, updated_at = ? WHERE id = ?', [
    now,
    now,
    id,
  ]);
}

// Places still waiting for a link or address lookup, oldest first.
export async function listPendingPlaces(db: SqlDatabase): Promise<Memory[]> {
  const rows = await db.getAllAsync<MemoryRow>(
    `SELECT * FROM memory
     WHERE type = 'place' AND status <> 'resolved' AND deleted_at IS NULL
     ORDER BY created_at, rowid`,
  );
  return rows.map(toMemory);
}

export type LookupResult = {
  lat: number | null;
  lng: number | null;
  address: string | null;
  status: MemoryStatus;
};

// Stores what a background lookup found. It only fills in coordinates or an address that are
// still empty, so anything the user typed while the lookup was running is kept.
export async function saveLookupResult(
  db: SqlDatabase,
  id: string,
  result: LookupResult,
): Promise<void> {
  await db.runAsync(
    `UPDATE memory SET
       lat = CASE WHEN lat IS NULL OR lng IS NULL THEN ? ELSE lat END,
       lng = CASE WHEN lat IS NULL OR lng IS NULL THEN ? ELSE lng END,
       address = CASE WHEN address IS NULL OR trim(address) = '' THEN ? ELSE address END,
       status = ?,
       updated_at = max(updated_at, ?)
     WHERE id = ? AND deleted_at IS NULL`,
    [result.lat, result.lng, result.address, result.status, Date.now(), id],
  );
}

export async function listPlacesForPerson(db: SqlDatabase, personId: string): Promise<Memory[]> {
  const rows = await db.getAllAsync<MemoryRow>(
    `SELECT * FROM memory
     WHERE person_id = ? AND type = 'place' AND deleted_at IS NULL
     ORDER BY created_at DESC, rowid DESC`,
    [personId],
  );
  return rows.map(toMemory);
}
