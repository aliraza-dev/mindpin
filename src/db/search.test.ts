// T049: search (R6.1, R6.2, R6.4).
import { createNote, createPlace, softDeleteMemory } from './memories';
import { createPerson } from './people';
import { buildMatchQuery, searchMemories } from './search';
import { freshDb } from './testing/freshDb';
import type { SqlDatabase } from './types';

async function seeded() {
  const db = await freshDb();
  const ahmed = await createPerson(db, { name: 'Ahmed Raza' });
  const sara = await createPerson(db, { name: 'Sara Malik' });
  const shop = await createPlace(db, {
    personId: ahmed.id,
    title: 'Shop',
    address: 'Main Boulevard, Gulberg',
    notes: 'Next to the blue pharmacy',
    tags: ['parking', 'gate code'],
    lat: 31.5,
    lng: 74.3,
  });
  const office = await createPlace(db, {
    personId: sara.id,
    title: 'Office',
    address: 'Café Lane, München Block',
    notes: 'Ask for Ahmed at the desk',
  });
  return { db, ahmed, sara, shop, office };
}

const ids = async (db: SqlDatabase, text: string) =>
  (await searchMemories(db, text)).map((r) => r.memory.id);

describe('buildMatchQuery', () => {
  it('turns each typed word into a quoted prefix term', () => {
    expect(buildMatchQuery('  ahmed  sho ')).toBe('"ahmed"* "sho"*');
  });

  it('returns null when nothing was typed', () => {
    expect(buildMatchQuery('   ')).toBeNull();
  });

  it('keeps search operators and quotes as plain text', () => {
    expect(buildMatchQuery('AND "x" title:y')).toBe('"AND"* """x"""* "title:y"*');
  });
});

describe('searchMemories', () => {
  it('matches person names, labels, addresses, place notes, and tags (R6.1)', async () => {
    const { db, shop, office } = await seeded();
    expect(await ids(db, 'sara')).toEqual([office.id]);
    expect(await ids(db, 'shop')).toEqual([shop.id]);
    expect(await ids(db, 'gulberg')).toEqual([shop.id]);
    expect(await ids(db, 'pharmacy')).toEqual([shop.id]);
    expect(await ids(db, 'parking')).toEqual([shop.id]);
  });

  it('matches while the user is still typing a word, in any letter case (R6.2)', async () => {
    const { db, shop } = await seeded();
    expect(await ids(db, 'gu')).toEqual([shop.id]);
    expect(await ids(db, 'GULB')).toEqual([shop.id]);
    expect(await ids(db, 'ahmed sh')).toEqual([shop.id]);
  });

  it('needs every typed word to match', async () => {
    const { db } = await seeded();
    expect(await ids(db, 'ahmed office')).toEqual([expect.any(String)]);
    expect(await ids(db, 'sara gulberg')).toEqual([]);
  });

  it('ignores accents', async () => {
    const { db, office } = await seeded();
    expect(await ids(db, 'cafe munchen')).toEqual([office.id]);
  });

  it("puts a match on the person's name or the label above a match in the notes", async () => {
    const { db, shop, office } = await seeded();
    // "ahmed" is the shop's person, but only appears in the office's notes.
    expect(await ids(db, 'ahmed')).toEqual([shop.id, office.id]);
  });

  it("returns each result with its person's name", async () => {
    const { db, shop } = await seeded();
    const [result] = await searchMemories(db, 'shop');
    expect(result.personName).toBe('Ahmed Raza');
    expect(result.memory).toMatchObject({
      id: shop.id,
      title: 'Shop',
      tags: ['parking', 'gate code'],
    });
  });

  it('finds notes and places without a person, and leaves out deleted ones', async () => {
    const { db, shop } = await seeded();
    const note = await createNote(db, {
      title: 'Gift ideas',
      notes: 'Gift ideas\nShawl, glasses case',
    });
    expect(await searchMemories(db, 'shawl')).toEqual([
      { memory: expect.objectContaining({ id: note.id, type: 'note' }), personName: null },
    ]);
    await softDeleteMemory(db, shop.id);
    expect(await ids(db, 'shop')).toEqual([]);
  });

  it('finds a standalone note by any word in its title, text, or checklist (R6.1)', async () => {
    const { db } = await seeded();
    const note = await createNote(db, {
      title: 'Shop opening',
      notes:
        'Shop opening\nFriday at 6pm, family first.\n- [ ] Sweets from the bakery\n- [x] Framed gift',
    });
    for (const word of ['opening', 'friday', 'bakery', 'framed']) {
      expect(await ids(db, word)).toContain(note.id);
    }
  });

  it('returns nothing for an empty or punctuation-only search, without failing', async () => {
    const { db } = await seeded();
    expect(await searchMemories(db, '   ')).toEqual([]);
    expect(await searchMemories(db, '— "')).toEqual([]);
    expect(await searchMemories(db, 'AND OR NOT (')).toEqual([]);
  });

  it('works with no connection: it never touches the network (R6.4)', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const { db, shop } = await seeded();
    expect(await ids(db, 'shop')).toEqual([shop.id]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('search speed with 5,000 places (R6.2)', () => {
  let db: SqlDatabase;

  beforeAll(async () => {
    db = await freshDb();
    await db.withTransactionAsync(async () => {
      for (let p = 0; p < 500; p++) {
        await db.runAsync(
          'INSERT INTO person (id, name, created_at, updated_at) VALUES (?, ?, 1, 1)',
          [`p${p}`, `Person${p} Family${p % 40}`],
        );
      }
      for (let i = 0; i < 5000; i++) {
        await db.runAsync(
          `INSERT INTO memory (id, type, person_id, title, address, notes, tags, created_at, updated_at)
           VALUES (?, 'place', ?, ?, ?, ?, ?, ?, ?)`,
          [
            `m${i}`,
            `p${i % 500}`,
            ['Home', 'Office', 'Shop'][i % 3],
            `${i} Sample Road, Block ${i % 26}, Sample Town`,
            `Gate ${i}, floor ${i % 9}, ring twice`,
            '["parking"]',
            i,
            i,
          ],
        );
      }
    });
  }, 120_000);

  it.each(['sample', 'pe fa', 'gate 4999', 'office park', 's'])(
    'answers "%s" within 300 ms',
    async (text) => {
      const started = performance.now();
      const results = await searchMemories(db, text);
      const elapsed = performance.now() - started;
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(50);
      expect(elapsed).toBeLessThan(300);
    },
  );
});
