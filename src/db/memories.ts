import { newId } from '../lib/id';
import type { SqlDatabase, SqlValue } from './types';

export type MemoryType = 'place' | 'note';
export type MemoryStatus = 'resolved' | 'pending_resolve';

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

type MemoryRow = {
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

function toMemory(row: MemoryRow): Memory {
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

export async function listPlacesForPerson(db: SqlDatabase, personId: string): Promise<Memory[]> {
  const rows = await db.getAllAsync<MemoryRow>(
    `SELECT * FROM memory
     WHERE person_id = ? AND type = 'place' AND deleted_at IS NULL
     ORDER BY created_at DESC, rowid DESC`,
    [personId],
  );
  return rows.map(toMemory);
}
