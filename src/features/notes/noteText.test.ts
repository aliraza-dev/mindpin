// T065: note title, preview, and checklists (R10.2, R10.5).
import { notePreview, noteTitle, toggleChecklistItem } from './noteText';

describe('noteTitle (R10.2)', () => {
  it('is the first line of the note', () => {
    expect(noteTitle('Shop opening\nFriday at 6pm')).toBe('Shop opening');
  });

  it('skips blank lines and drops Markdown markers', () => {
    expect(noteTitle('\n\n# Shop **opening**\nFriday')).toBe('Shop opening');
    expect(noteTitle('- [ ] Buy _sweets_')).toBe('Buy sweets');
    expect(noteTitle('1. First step')).toBe('First step');
  });

  it('keeps characters that only look like markers', () => {
    expect(noteTitle('5 * 3 = 15 for gate_code_2')).toBe('5 * 3 = 15 for gate_code_2');
  });

  it('is empty for an empty note', () => {
    expect(noteTitle('  \n ')).toBe('');
  });
});

describe('notePreview (R10.2)', () => {
  it('is the text after the first line, on one line', () => {
    expect(notePreview('Shop opening\n\nFriday at 6pm.\n- [ ] Sweets\n- [x] **Gift**')).toBe(
      'Friday at 6pm. Sweets Gift',
    );
  });

  it('is empty when the note has only a title', () => {
    expect(notePreview('Shop opening\n\n')).toBe('');
  });

  it('is cut to the length asked for', () => {
    const preview = notePreview(`Title\n${'word '.repeat(100)}`, 20);
    expect(preview).toBe('word word word word');
    expect(preview.length).toBeLessThanOrEqual(20);
  });
});

describe('toggleChecklistItem (R10.5)', () => {
  const lines = (...parts: string[]) => parts.join('\n');

  it('ticks an item and moves it to the bottom of its checklist', () => {
    const body = lines('Bring', '- [ ] Sweets', '- [ ] Gift', '- [x] Ride', '', 'Parking');
    expect(toggleChecklistItem(body, 1)).toBe(
      lines('Bring', '- [ ] Gift', '- [x] Ride', '- [x] Sweets', '', 'Parking'),
    );
  });

  it('unticks an item and moves it back above the ticked ones', () => {
    const body = lines('- [ ] A', '- [x] B', '- [x] C');
    expect(toggleChecklistItem(body, 2)).toBe(lines('- [ ] A', '- [ ] C', '- [x] B'));
    expect(toggleChecklistItem(lines('- [ ] A', '- [x] B'), 1)).toBe(lines('- [ ] A', '- [ ] B'));
  });

  it('only reorders the checklist the item belongs to', () => {
    const body = lines('- [ ] A', '- [ ] B', '', '- [ ] C', '- [ ] D');
    expect(toggleChecklistItem(body, 2 + 1)).toBe(lines('- [ ] A', '- [ ] B', '', '- [ ] D', '- [x] C'));
  });

  it('moves an item together with its indented sub-items', () => {
    const body = lines('- [ ] A', '  - [ ] A1', '  more about A', '- [ ] B');
    expect(toggleChecklistItem(body, 0)).toBe(
      lines('- [ ] B', '- [x] A', '  - [ ] A1', '  more about A'),
    );
  });

  it('reorders sub-items among themselves', () => {
    const body = lines('- [ ] A', '  - [ ] A1', '  - [ ] A2', '- [ ] B');
    expect(toggleChecklistItem(body, 1)).toBe(lines('- [ ] A', '  - [ ] A2', '  - [x] A1', '- [ ] B'));
  });

  it('works for numbered and starred checklist items', () => {
    expect(toggleChecklistItem(lines('1. [ ] A', '2. [ ] B'), 0)).toBe(lines('2. [ ] B', '1. [x] A'));
    expect(toggleChecklistItem(lines('* [X] A', '* [ ] B'), 0)).toBe(lines('* [ ] B', '* [ ] A'));
  });

  it('leaves the note alone when the line is not a checklist item', () => {
    const body = lines('Title', '- plain bullet', '- [ ] A');
    expect(toggleChecklistItem(body, 0)).toBe(body);
    expect(toggleChecklistItem(body, 1)).toBe(body);
    expect(toggleChecklistItem(body, 99)).toBe(body);
  });
});
