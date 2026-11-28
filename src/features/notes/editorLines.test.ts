// T068: the edits behind the note editor (R10.4).
import {
  editLine,
  emphasisSpans,
  joinWithPrevious,
  parseLine,
  toggleEmphasis,
  toggleLineKind,
} from './editorLines';

describe('editorLines', () => {
  it('reads headings, lists, and checklist items from Markdown', () => {
    expect(parseLine('# Trip')).toEqual({ kind: 'title', text: 'Trip' });
    expect(parseLine('## Packing')).toEqual({ kind: 'heading', text: 'Packing' });
    expect(parseLine('- Sweets')).toEqual({ kind: 'bullet', text: 'Sweets' });
    expect(parseLine('2. Second')).toEqual({ kind: 'number', text: 'Second' });
    expect(parseLine('- [ ] Call')).toEqual({ kind: 'todo', text: 'Call' });
    expect(parseLine('- [x] Paid')).toEqual({ kind: 'done', text: 'Paid' });
    expect(parseLine('Plain')).toEqual({ kind: 'text', text: 'Plain' });
  });

  it('keeps typing inside its line', () => {
    expect(editLine('- [ ] Cal', 0, 'Call')).toEqual({ body: '- [ ] Call', focus: 0 });
  });

  it('carries a list on to the next line on Enter, and ends it on an empty item', () => {
    expect(editLine('- Sweets', 0, 'Sweets\n')).toEqual({ body: '- Sweets\n- ', focus: 1 });
    expect(editLine('- [x] Paid', 0, 'Paid\n')).toEqual({ body: '- [x] Paid\n- [ ] ', focus: 1 });
    expect(editLine('- Sweets\n- ', 1, '\n')).toEqual({ body: '- Sweets\n', focus: 1 });
    expect(editLine('# Trip', 0, 'Trip\n')).toEqual({ body: '# Trip\n', focus: 1 });
  });

  it('numbers a numbered list from 1 as lines are added', () => {
    expect(editLine('1. One', 0, 'One\nTwo\nThree')).toEqual({
      body: '1. One\n2. Two\n3. Three',
      focus: 2,
    });
  });

  it('splits a pasted block into lines', () => {
    expect(editLine('', 0, 'a\nb\nc')).toEqual({ body: 'a\nb\nc', focus: 2 });
  });

  it('joins a line with the one above on Backspace, after first dropping its style', () => {
    expect(joinWithPrevious('One\n- Two', 1)).toEqual({ body: 'One\nTwo', focus: 1, cursor: 0 });
    expect(joinWithPrevious('One\nTwo', 1)).toEqual({ body: 'OneTwo', focus: 0, cursor: 3 });
    expect(joinWithPrevious('One', 0)).toEqual({ body: 'One', focus: 0, cursor: null });
  });

  it('turns a line style on and off from the toolbar', () => {
    expect(toggleLineKind('Packing', 0, 'heading')).toBe('## Packing');
    expect(toggleLineKind('## Packing', 0, 'heading')).toBe('Packing');
    expect(toggleLineKind('Call', 0, 'todo')).toBe('- [ ] Call');
    expect(toggleLineKind('- [x] Call', 0, 'todo')).toBe('Call');
    expect(toggleLineKind('a\nb', 1, 'number')).toBe('a\n1. b');
    expect(toggleLineKind('- a', 0, 'number')).toBe('1. a');
  });

  it('makes the selection bold or italic, and plain again', () => {
    expect(toggleEmphasis('gate code 4471', 5, 9, '**')).toBe('gate **code** 4471');
    expect(toggleEmphasis('gate **code** 4471', 5, 13, '**')).toBe('gate code 4471');
    expect(toggleEmphasis('ring twice', 0, 0, '*')).toBe('*ring twice*');
    expect(toggleEmphasis('*ring twice*', 0, 0, '*')).toBe('ring twice');
    expect(toggleEmphasis('   ', 0, 0, '**')).toBe('   ');
  });

  it('splits a line into plain, bold, and italic runs that add up to the line', () => {
    const text = 'use **gate 2** and *ring* twice';
    const spans = emphasisSpans(text);
    expect(spans.map((span) => span.text).join('')).toBe(text);
    expect(spans.filter((span) => span.bold).map((span) => span.text)).toEqual(['gate 2']);
    expect(spans.filter((span) => span.italic).map((span) => span.text)).toEqual(['ring']);
    expect(spans.filter((span) => span.mark)).toHaveLength(4);
    expect(emphasisSpans('2 * 3 * 4')).toEqual([
      { text: '2 * 3 * 4', bold: false, italic: false, mark: false },
    ]);
  });
});
