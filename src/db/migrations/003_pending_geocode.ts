import type { Migration } from '../types';

// Adds the pending_geocode status to memory.status (design.md). SQLite cannot change a CHECK
// constraint in place, so the table is rebuilt: copy every row to a new table, swap it in, then
// recreate the indexes and search triggers that belonged to the old table. Row ids do not change,
// so visits, note links, and the search index stay valid.
export const migration003: Migration = {
  version: 3,
  name: 'pending_geocode status',
  foreignKeysOff: true,
  sql: `
    -- Refers to memory in its body; dropped first so the table swap cannot break it.
    DROP TRIGGER person_fts_rename;

    CREATE TABLE memory_new (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('place', 'note')),
      person_id TEXT REFERENCES person (id),
      place_id TEXT REFERENCES memory (id),
      title TEXT NOT NULL DEFAULT '',
      lat REAL,
      lng REAL,
      address TEXT,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
      source_app TEXT,
      source_raw TEXT,
      status TEXT NOT NULL DEFAULT 'resolved'
        CHECK (status IN ('resolved', 'pending_resolve', 'pending_geocode')),
      payload TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    INSERT INTO memory_new (
      id, type, person_id, place_id, title, lat, lng, address, notes, tags, pinned,
      source_app, source_raw, status, payload, created_at, updated_at, deleted_at
    )
    SELECT
      id, type, person_id, place_id, title, lat, lng, address, notes, tags, pinned,
      source_app, source_raw, status, payload, created_at, updated_at, deleted_at
    FROM memory;

    -- Dropping the old table also drops its indexes and triggers.
    DROP TABLE memory;
    ALTER TABLE memory_new RENAME TO memory;

    CREATE INDEX memory_person ON memory (person_id) WHERE deleted_at IS NULL;
    CREATE INDEX memory_type_updated ON memory (type, updated_at) WHERE deleted_at IS NULL;

    CREATE TRIGGER memory_fts_insert AFTER INSERT ON memory
    WHEN new.deleted_at IS NULL
    BEGIN
      INSERT INTO memory_fts (memory_id, person_name, title, address, notes, tags)
      VALUES (
        new.id,
        (SELECT name FROM person WHERE id = new.person_id),
        new.title, new.address, new.notes, new.tags
      );
    END;

    CREATE TRIGGER memory_fts_update AFTER UPDATE ON memory
    BEGIN
      DELETE FROM memory_fts WHERE memory_id = old.id;
      INSERT INTO memory_fts (memory_id, person_name, title, address, notes, tags)
      SELECT
        new.id,
        (SELECT name FROM person WHERE id = new.person_id),
        new.title, new.address, new.notes, new.tags
      WHERE new.deleted_at IS NULL;
    END;

    CREATE TRIGGER memory_fts_delete AFTER DELETE ON memory
    BEGIN
      DELETE FROM memory_fts WHERE memory_id = old.id;
    END;

    CREATE TRIGGER person_fts_rename AFTER UPDATE OF name ON person
    BEGIN
      UPDATE memory_fts SET person_name = new.name
      WHERE memory_id IN (SELECT id FROM memory WHERE person_id = new.id);
    END;
  `,
};
