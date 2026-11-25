import type { Migration } from '../types';

// Full-text index over person name and memory title, address, notes, and tags (design.md).
// Triggers keep it current; soft-deleted memories are left out. Prefix indexes support
// search as you type (R6.2).
export const migration002: Migration = {
  version: 2,
  name: 'search index',
  sql: `
    CREATE VIRTUAL TABLE memory_fts USING fts5(
      memory_id UNINDEXED,
      person_name,
      title,
      address,
      notes,
      tags,
      tokenize = 'unicode61 remove_diacritics 2',
      prefix = '2 3'
    );

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
