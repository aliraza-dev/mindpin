import type { Migration } from '../types';

// Tables from the data model in docs/spec/design.md.
export const migration001: Migration = {
  version: 1,
  name: 'initial schema',
  sql: `
    CREATE TABLE person (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      phone TEXT,
      contact_ref TEXT,
      photo_uri TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- R3.7: one person per device contact. Empty or missing refs are not linked to a contact.
    CREATE UNIQUE INDEX person_contact_ref_unique
      ON person (contact_ref) WHERE contact_ref IS NOT NULL AND contact_ref <> '';

    CREATE TABLE memory (
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
      status TEXT NOT NULL DEFAULT 'resolved' CHECK (status IN ('resolved', 'pending_resolve')),
      payload TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE INDEX memory_person ON memory (person_id) WHERE deleted_at IS NULL;
    CREATE INDEX memory_type_updated ON memory (type, updated_at) WHERE deleted_at IS NULL;

    CREATE TABLE visit (
      id TEXT PRIMARY KEY NOT NULL,
      memory_id TEXT NOT NULL REFERENCES memory (id),
      visited_at INTEGER NOT NULL,
      note TEXT,
      source TEXT NOT NULL CHECK (source IN ('manual', 'navigate_confirm'))
    );

    CREATE INDEX visit_memory_time ON visit (memory_id, visited_at DESC);

    CREATE TABLE setting (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `,
};
