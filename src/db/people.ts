import { newId } from '../lib/id';
import type { SqlDatabase } from './types';

export type Person = {
  id: string;
  name: string;
  phone: string | null;
  contactRef: string | null;
  photoUri: string | null;
  createdAt: number;
  updatedAt: number;
};

export type NewPerson = {
  name: string;
  phone?: string | null;
  contactRef?: string | null;
  photoUri?: string | null;
};

type PersonRow = {
  id: string;
  name: string;
  phone: string | null;
  contact_ref: string | null;
  photo_uri: string | null;
  created_at: number;
  updated_at: number;
};

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    contactRef: row.contact_ref,
    photoUri: row.photo_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A person needs a name');
  return trimmed;
}

export async function createPerson(db: SqlDatabase, input: NewPerson): Promise<Person> {
  const now = Date.now();
  const person: Person = {
    id: newId(),
    name: cleanName(input.name),
    phone: input.phone ?? null,
    contactRef: input.contactRef ?? null,
    photoUri: input.photoUri ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO person (id, name, phone, contact_ref, photo_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      person.id,
      person.name,
      person.phone,
      person.contactRef,
      person.photoUri,
      person.createdAt,
      person.updatedAt,
    ],
  );
  return person;
}

export async function getPerson(db: SqlDatabase, id: string): Promise<Person | null> {
  const row = await db.getFirstAsync<PersonRow>('SELECT * FROM person WHERE id = ?', [id]);
  return row ? toPerson(row) : null;
}

export async function findPersonByContactRef(
  db: SqlDatabase,
  contactRef: string,
): Promise<Person | null> {
  const row = await db.getFirstAsync<PersonRow>('SELECT * FROM person WHERE contact_ref = ?', [
    contactRef,
  ]);
  return row ? toPerson(row) : null;
}

export async function listPeople(db: SqlDatabase): Promise<Person[]> {
  const rows = await db.getAllAsync<PersonRow>(
    'SELECT * FROM person ORDER BY name COLLATE NOCASE',
  );
  return rows.map(toPerson);
}

// People ordered by when they were last used: the latest of their newest place or note and
// their own last change (R3.3).
export async function listRecentlyUsedPeople(db: SqlDatabase, limit: number): Promise<Person[]> {
  const rows = await db.getAllAsync<PersonRow>(
    `SELECT p.* FROM person p
     LEFT JOIN memory m ON m.person_id = p.id AND m.deleted_at IS NULL
     GROUP BY p.id
     ORDER BY max(coalesce(max(m.created_at), 0), p.updated_at) DESC, p.rowid DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map(toPerson);
}

export async function updatePerson(
  db: SqlDatabase,
  id: string,
  patch: Partial<NewPerson>,
): Promise<Person> {
  const existing = await getPerson(db, id);
  if (!existing) throw new Error('Person not found');
  const updated: Person = {
    ...existing,
    name: patch.name === undefined ? existing.name : cleanName(patch.name),
    phone: patch.phone === undefined ? existing.phone : patch.phone,
    contactRef: patch.contactRef === undefined ? existing.contactRef : patch.contactRef,
    photoUri: patch.photoUri === undefined ? existing.photoUri : patch.photoUri,
    updatedAt: Math.max(Date.now(), existing.updatedAt),
  };
  await db.runAsync(
    `UPDATE person SET name = ?, phone = ?, contact_ref = ?, photo_uri = ?, updated_at = ?
     WHERE id = ?`,
    [updated.name, updated.phone, updated.contactRef, updated.photoUri, updated.updatedAt, id],
  );
  return updated;
}
