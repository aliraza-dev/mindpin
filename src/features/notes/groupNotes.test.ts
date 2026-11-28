// T066: the Notes list order and sections (R10.6, R10.7).
import { firstNotes, groupNotes, type NoteSection } from './groupNotes';

// Local time, so the test does not depend on the machine's time zone.
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();
const NOW = at(2026, 11, 26, 15);

const note = (id: string, updatedAt: number, pinned = false) => ({ id, updatedAt, pinned });
const shape = (sections: NoteSection<{ id: string }>[]) =>
  sections.map((s) => [
    s.kind === 'month' ? `${s.year}-${s.month}` : s.kind,
    s.notes.map((n) => n.id),
  ]);

describe('groupNotes', () => {
  it('puts pinned notes in their own section above all others (R10.6)', () => {
    const sections = groupNotes(
      [
        note('today', at(2026, 11, 26, 9)),
        note('old-pin', at(2026, 3, 1), true),
        note('new-pin', NOW, true),
      ],
      NOW,
    );
    expect(shape(sections)).toEqual([
      ['pinned', ['new-pin', 'old-pin']],
      ['today', ['today']],
    ]);
  });

  it('groups by Today, Previous 7 days, Previous 30 days, then month (R10.7)', () => {
    const sections = groupNotes(
      [
        note('this-morning', at(2026, 11, 26, 1)),
        note('yesterday', at(2026, 11, 25, 23)),
        note('7-days', at(2026, 11, 19)),
        note('8-days', at(2026, 11, 18)),
        note('30-days', at(2026, 10, 27)),
        note('31-days', at(2026, 10, 26)),
        note('september', at(2026, 9, 14)),
        note('last-year', at(2025, 11, 26)),
      ],
      NOW,
    );
    expect(shape(sections)).toEqual([
      ['today', ['this-morning']],
      ['previous7', ['yesterday', '7-days']],
      ['previous30', ['8-days', '30-days']],
      ['2026-10', ['31-days']],
      ['2026-9', ['september']],
      ['2025-11', ['last-year']],
    ]);
  });

  it('sorts each section by last edited, newest first', () => {
    const sections = groupNotes(
      [
        note('a', at(2026, 11, 26, 8)),
        note('c', at(2026, 11, 26, 14)),
        note('b', at(2026, 11, 26, 11)),
      ],
      NOW,
    );
    expect(shape(sections)).toEqual([['today', ['c', 'b', 'a']]]);
  });

  it('leaves out empty sections and treats a clock that moved back as today', () => {
    expect(groupNotes([], NOW)).toEqual([]);
    expect(shape(groupNotes([note('future', at(2026, 11, 28))], NOW))).toEqual([
      ['today', ['future']],
    ]);
  });

  it('takes the first notes of the list in order, keeping their sections', () => {
    const sections = groupNotes(
      [
        note('p', at(2026, 11, 1), true),
        note('a', NOW),
        note('b', NOW - 1000),
        note('c', at(2026, 11, 22)),
      ],
      NOW,
    );
    expect(shape(firstNotes(sections, 2))).toEqual([
      ['pinned', ['p']],
      ['today', ['a']],
    ]);
    expect(firstNotes(sections, 10)).toEqual(sections);
    expect(firstNotes(sections, 0)).toEqual([]);
  });
});
