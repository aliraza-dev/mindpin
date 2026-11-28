// T068: the edits behind the note editor (R10.4).
import {
  BOLD,
  buildInline,
  editLine,
  ITALIC,
  joinWithPrevious,
  parseInline,
  parseLine,
  rangeHas,
  styleAt,
  styledSpans,
  toggleLineKind,
  toggleStyle,
} from './editorLines';

describe('editorLines', () => {
  it('reads headings, lists, and checklist items from Markdown', () => {
    expect(parseLine('# Trip')).toMatchObject({ kind: 'title', text: 'Trip' });
    expect(parseLine('## Packing')).toMatchObject({ kind: 'heading', text: 'Packing' });
    expect(parseLine('- Sweets')).toMatchObject({ kind: 'bullet', text: 'Sweets' });
    expect(parseLine('2. Second')).toMatchObject({ kind: 'number', text: 'Second' });
    expect(parseLine('- [ ] Call')).toMatchObject({ kind: 'todo', text: 'Call' });
    expect(parseLine('- [x] Paid')).toMatchObject({ kind: 'done', text: 'Paid' });
    expect(parseLine('Plain')).toMatchObject({ kind: 'text', text: 'Plain' });
  });

  it('keeps typing inside its line', () => {
    expect(editLine('- [ ] Cal', 0, 'Call')).toMatchObject({ body: '- [ ] Call', focus: 0 });
  });

  it('carries a list on to the next line on Enter, and ends it on an empty item', () => {
    expect(editLine('- Sweets', 0, 'Sweets\n')).toMatchObject({ body: '- Sweets\n- ', focus: 1 });
    expect(editLine('- [x] Paid', 0, 'Paid\n')).toMatchObject({
      body: '- [x] Paid\n- [ ] ',
      focus: 1,
    });
    expect(editLine('- Sweets\n- ', 1, '\n')).toMatchObject({ body: '- Sweets\n', focus: 1 });
    expect(editLine('# Trip', 0, 'Trip\n')).toMatchObject({ body: '# Trip\n', focus: 1 });
  });

  it('numbers a numbered list from 1 as lines are added', () => {
    expect(editLine('1. One', 0, 'One\nTwo\nThree')).toMatchObject({
      body: '1. One\n2. Two\n3. Three',
      focus: 2,
    });
  });

  it('splits a pasted block into lines', () => {
    expect(editLine('', 0, 'a\nb\nc')).toMatchObject({ body: 'a\nb\nc', focus: 2 });
  });

  it('joins a line with the one above on Backspace, after first dropping its style', () => {
    expect(joinWithPrevious('One\n- Two', 1)).toMatchObject({
      body: 'One\nTwo',
      focus: 1,
      cursor: 0,
    });
    expect(joinWithPrevious('One\nTwo', 1)).toMatchObject({ body: 'OneTwo', focus: 0, cursor: 3 });
    expect(joinWithPrevious('One', 0)).toMatchObject({ body: 'One', focus: 0, cursor: null });
  });

  it('turns a line style on and off from the toolbar', () => {
    expect(toggleLineKind('Packing', 0, 'heading')).toBe('## Packing');
    expect(toggleLineKind('## Packing', 0, 'heading')).toBe('Packing');
    expect(toggleLineKind('Call', 0, 'todo')).toBe('- [ ] Call');
    expect(toggleLineKind('- [x] Call', 0, 'todo')).toBe('Call');
    expect(toggleLineKind('a\nb', 1, 'number')).toBe('a\n1. b');
    expect(toggleLineKind('- a', 0, 'number')).toBe('1. a');
  });

  it('keeps Markdown marks out of the text the user sees', () => {
    expect(parseInline('use **gate 2** and *ring* twice')).toEqual({
      text: 'use gate 2 and ring twice',
      marks: '0000111111000002222000000',
    });
    expect(parseInline('***both***').marks).toBe('3333');
    // Asterisks that are not marks stay as they are.
    expect(parseInline('2 * 3 * 4')).toEqual({ text: '2 * 3 * 4', marks: '000000000' });
    expect(parseInline('half **open')).toEqual({ text: 'half **open', marks: '00000000000' });
    expect(parseLine('- [ ] **Sweets**')).toEqual({
      kind: 'todo',
      text: 'Sweets',
      marks: '111111',
    });
  });

  it('writes styles as Markdown that reads back the same', () => {
    expect(buildInline('gate code', '000011111')).toBe('gate **code**');
    // Spaces at the edge of a styled run go outside its marks.
    expect(buildInline('a b c', '01110')).toBe('a **b** c');
    expect(buildInline('2 * 3', '00000')).toBe('2 \\* 3');
    for (const [text, marks] of [
      ['boldital plain', '11112222000000'],
      ['abcd', '1133'],
      ['abcd', '2233'],
      ['a*b', '111'],
    ]) {
      expect(parseInline(buildInline(text, marks))).toEqual({ text, marks });
    }
  });

  it('makes the selection bold or italic, and plain again, without changing the text', () => {
    expect(toggleStyle('gate code 4471', 0, 5, 9, BOLD)).toBe('gate **code** 4471');
    expect(toggleStyle('gate **code** 4471', 0, 5, 9, BOLD)).toBe('gate code 4471');
    expect(toggleStyle('gate **code** 4471', 0, 0, 9, BOLD)).toBe('**gate code** 4471');
    expect(toggleStyle('gate **code** 4471', 0, 5, 9, ITALIC)).toBe('gate ***code*** 4471');
    expect(toggleStyle('gate code', 0, 4, 4, BOLD)).toBe('gate code');
    expect(toggleStyle('- [ ] Sweets', 0, 0, 6, ITALIC)).toBe('- [ ] *Sweets*');
  });

  it('gives new writing the style before it, or the style that was chosen', () => {
    // Typing inside and straight after a bold word carries on bold; after plain text, plain.
    expect(editLine('gate **code**', 0, 'gate codes').body).toBe('gate **codes**');
    expect(editLine('gate **code**', 0, 'gates code').body).toBe('gates **code**');
    expect(editLine('gate', 0, 'gate x', BOLD).body).toBe('gate **x**');
    expect(editLine('**gate**', 0, 'gatex', 0).body).toBe('**gate**x');
    // Deleting leaves the styles of what remains.
    expect(editLine('gate **code** now', 0, 'gate co now').body).toBe('gate **co** now');
    // Enter in the middle of a bold word keeps both halves bold.
    expect(editLine('**gate**', 0, 'ga\nte')).toEqual({
      body: '**ga**\n**te**',
      focus: 1,
      cursor: 0,
    });
    expect(editLine('gate', 0, 'gates').cursor).toBe(5);
  });

  it('tells the style at the cursor and of a selection', () => {
    const line = parseLine('**gate** code');
    expect(styleAt(line, 4)).toBe(BOLD);
    expect(styleAt(line, 5)).toBe(BOLD);
    expect(styleAt(line, 7)).toBe(0);
    expect(styleAt(line, 0)).toBe(0);
    expect(rangeHas(line, 0, 4, BOLD)).toBe(true);
    expect(rangeHas(line, 0, 9, BOLD)).toBe(false);
    expect(rangeHas(line, 4, 5, BOLD)).toBe(false);
  });

  it('splits a line into plain, bold, and italic runs that add up to its text', () => {
    const line = parseLine('use **gate 2** and *ring* twice');
    const spans = styledSpans(line);
    expect(spans.map((span) => span.text).join('')).toBe('use gate 2 and ring twice');
    expect(spans.filter((span) => span.bold).map((span) => span.text)).toEqual(['gate 2']);
    expect(spans.filter((span) => span.italic).map((span) => span.text)).toEqual(['ring']);
  });
});
