// Schema checks against the data model in docs/spec/design.md.
import { freshDb } from './testing/freshDb';
import type { SqlDatabase } from './types';

async function columns(db: SqlDatabase, table: string) {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name).sort();
}

const now = 1_700_000_000_000;

async function insertPerson(db: SqlDatabase, id: string, name: string, contactRef: string | null) {
  await db.runAsync(
    'INSERT INTO person (id, name, contact_ref, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, contactRef, now, now],
  );
}

async function insertMemory(db: SqlDatabase, fields: Record<string, string | number | null>) {
  const row = {
    id: 'm1',
    type: 'place',
    title: 'Home',
    tags: '[]',
    status: 'resolved',
    created_at: now,
    updated_at: now,
    ...fields,
  };
  const keys = Object.keys(row);
  await db.runAsync(
    `INSERT INTO memory (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    Object.values(row),
  );
}

describe('schema (design.md data model)', () => {
  it('creates person, memory, visit, and setting with the designed columns', async () => {
    const db = await freshDb();
    expect(await columns(db, 'person')).toEqual(
      ['contact_ref', 'created_at', 'id', 'name', 'phone', 'photo_uri', 'updated_at'].sort(),
    );
    expect(await columns(db, 'memory')).toEqual(
      [
        'address',
        'created_at',
        'deleted_at',
        'id',
        'lat',
        'lng',
        'notes',
        'payload',
        'person_id',
        'pinned',
        'place_id',
        'source_app',
        'source_raw',
        'status',
        'tags',
        'title',
        'type',
        'updated_at',
      ].sort(),
    );
    expect(await columns(db, 'visit')).toEqual(
      ['id', 'memory_id', 'note', 'source', 'visited_at'].sort(),
    );
    expect(await columns(db, 'setting')).toEqual(['key', 'value']);
  });

  it('rejects a second person with the same contact_ref (R3.7)', async () => {
    const db = await freshDb();
    await insertPerson(db, 'p1', 'A', 'contact-1');
    await expect(insertPerson(db, 'p2', 'B', 'contact-1')).rejects.toThrow();
  });

  it('allows any number of people without a contact_ref', async () => {
    const db = await freshDb();
    await insertPerson(db, 'p1', 'A', null);
    await insertPerson(db, 'p2', 'B', null);
    await insertPerson(db, 'p3', 'C', '');
    await insertPerson(db, 'p4', 'D', '');
    const rows = await db.getAllAsync('SELECT id FROM person');
    expect(rows).toHaveLength(4);
  });

  it('rejects memory.type values other than place and note', async () => {
    const db = await freshDb();
    await expect(insertMemory(db, { type: 'receipt' })).rejects.toThrow();
  });

  it('rejects memory.status values other than resolved and pending_resolve', async () => {
    const db = await freshDb();
    await expect(insertMemory(db, { status: 'unknown' })).rejects.toThrow();
  });

  it('rejects visit.source values other than manual and navigate_confirm', async () => {
    const db = await freshDb();
    await insertMemory(db, {});
    await expect(
      db.runAsync(
        "INSERT INTO visit (id, memory_id, visited_at, source) VALUES ('v1', 'm1', 1, 'auto')",
      ),
    ).rejects.toThrow();
  });

  it('rejects a memory linked to a person that does not exist', async () => {
    const db = await freshDb();
    await expect(insertMemory(db, { person_id: 'missing' })).rejects.toThrow();
  });
});

describe('full-text search index', () => {
  async function search(db: SqlDatabase, query: string) {
    const rows = await db.getAllAsync<{ memory_id: string }>(
      'SELECT memory_id FROM memory_fts WHERE memory_fts MATCH ? ORDER BY memory_id',
      [query],
    );
    return rows.map((r) => r.memory_id);
  }

  async function seed() {
    const db = await freshDb();
    await insertPerson(db, 'p1', 'Ahmed Raza', null);
    await insertMemory(db, {
      id: 'm1',
      person_id: 'p1',
      title: 'Shop',
      address: 'Main Boulevard, Gulberg',
      notes: 'Next to the blue pharmacy',
      tags: '["parking"]',
    });
    return db;
  }

  it('indexes person name, title, address, notes, and tags', async () => {
    const db = await seed();
    expect(await search(db, 'ahmed')).toEqual(['m1']);
    expect(await search(db, 'shop')).toEqual(['m1']);
    expect(await search(db, 'gulberg')).toEqual(['m1']);
    expect(await search(db, 'pharmacy')).toEqual(['m1']);
    expect(await search(db, 'parking')).toEqual(['m1']);
  });

  it('matches word prefixes for search as you type', async () => {
    const db = await seed();
    expect(await search(db, 'gul*')).toEqual(['m1']);
  });

  it('updates the index when a memory or person changes', async () => {
    const db = await seed();
    await db.runAsync("UPDATE memory SET address = 'DHA Phase 5' WHERE id = 'm1'");
    expect(await search(db, 'gulberg')).toEqual([]);
    expect(await search(db, 'dha')).toEqual(['m1']);
    await db.runAsync("UPDATE person SET name = 'Usman Khan' WHERE id = 'p1'");
    expect(await search(db, 'ahmed')).toEqual([]);
    expect(await search(db, 'usman')).toEqual(['m1']);
  });

  it('drops soft-deleted memories from the index', async () => {
    const db = await seed();
    await db.runAsync("UPDATE memory SET deleted_at = 1 WHERE id = 'm1'");
    expect(await search(db, 'shop')).toEqual([]);
  });
});
