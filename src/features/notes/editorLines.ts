// The note editor works on one line at a time (design.md: a note is stored as Markdown, with
// checklists as task items). The editor never shows Markdown: a line is held as its plain
// text and, beside it, the style of every character. Markdown is only what gets stored.
// These are the edits the editor makes. Pure functions: no database, no UI.

export type LineKind = 'text' | 'title' | 'heading' | 'bullet' | 'number' | 'todo' | 'done';

// Character styles, added together: 1 bold, 2 italic, 3 both.
export const BOLD = 1;
export const ITALIC = 2;

export type ParsedLine = {
  kind: LineKind;
  // What the user sees and types: no Markdown marks.
  text: string;
  // One digit for every character of `text`: its style.
  marks: string;
};

const PATTERNS: [LineKind, RegExp][] = [
  ['todo', /^- \[ \] ?/],
  ['done', /^- \[[xX]\] ?/],
  ['title', /^# /],
  ['heading', /^#{2,6} /],
  ['bullet', /^[-*+] /],
  ['number', /^\d+[.)] /],
];

const LIST_KINDS: LineKind[] = ['bullet', 'number', 'todo', 'done'];
const SPACE = /\s/;

function scan(source: string, allLiteral: boolean) {
  let text = '';
  let marks = '';
  let style = 0;
  let at = 0;
  const emit = (value: string) => {
    text += value;
    marks += String(style).repeat(value.length);
  };
  while (at < source.length) {
    const char = source[at];
    if (char === '\\' && source[at + 1] === '*') {
      emit('*');
      at += 2;
      continue;
    }
    if (char !== '*' || allLiteral) {
      emit(char);
      at += 1;
      continue;
    }
    let count = 1;
    while (source[at + count] === '*') count += 1;
    // "***" changes both styles, "**" bold, "*" italic.
    let change = 0;
    let left = count;
    for (; left >= 3; left -= 3) change ^= BOLD | ITALIC;
    if (left === 2) change ^= BOLD;
    if (left === 1) change ^= ITALIC;
    const opens = (change & ~style) !== 0;
    const closes = (change & style) !== 0;
    const after = source[at + count];
    const spaceAfter = after === undefined || SPACE.test(after);
    const spaceBefore = at === 0 || SPACE.test(source[at - 1]);
    // An asterisk standing alone, as in "2 * 3", is just an asterisk.
    const literal =
      change === 0 || (opens && !closes && spaceAfter) || (closes && !opens && spaceBefore);
    if (literal) emit('*'.repeat(count));
    else style ^= change;
    at += count;
  }
  return { text, marks, open: style !== 0 };
}

// Reads the bold and italic out of a line of Markdown. A line whose marks do not pair up is
// taken as plain text, asterisks and all.
export function parseInline(source: string): { text: string; marks: string } {
  const read = scan(source, false);
  const { text, marks } = read.open ? scan(source, true) : read;
  return { text, marks };
}

const MARKS = ['', '**', '*', '***'];
const escape = (value: string) => value.replace(/\*/g, '\\*');

// Writes a line's text and styles as Markdown. Spaces at the edge of a styled run go outside
// its marks, as Markdown requires.
export function buildInline(text: string, marks: string): string {
  let out = '';
  let from = 0;
  while (from < text.length) {
    let to = from + 1;
    while (to < text.length && marks[to] === marks[from]) to += 1;
    const run = text.slice(from, to);
    const mark = MARKS[Number(marks[from])] ?? '';
    const core = run.trim();
    if (mark === '' || core === '') out += escape(run);
    else {
      const lead = run.length - run.trimStart().length;
      out += run.slice(0, lead) + mark + escape(core) + mark + run.slice(lead + core.length);
    }
    from = to;
  }
  return out;
}

export function parseLine(line: string): ParsedLine {
  for (const [kind, pattern] of PATTERNS) {
    const match = pattern.exec(line);
    if (match) return { kind, ...parseInline(line.slice(match[0].length)) };
  }
  return { kind: 'text', ...parseInline(line) };
}

function marker(kind: LineKind, number: number): string {
  switch (kind) {
    case 'title':
      return '# ';
    case 'heading':
      return '## ';
    case 'bullet':
      return '- ';
    case 'number':
      return `${number}. `;
    case 'todo':
      return '- [ ] ';
    case 'done':
      return '- [x] ';
    default:
      return '';
  }
}

// Builds the note text from its lines, numbering each run of numbered lines from 1.
function build(lines: ParsedLine[]): string {
  let count = 0;
  return lines
    .map(({ kind, text, marks }) => {
      count = kind === 'number' ? count + 1 : 0;
      return marker(kind, count) + buildInline(text, marks);
    })
    .join('\n');
}

export function parseBody(body: string): ParsedLine[] {
  return body.split('\n').map(parseLine);
}

// The style new writing takes at a place in a line: that of the writing before it, looking
// back past spaces, so that a bold phrase carries on being bold after a space.
export function styleAt(line: ParsedLine, position: number): number {
  for (let at = Math.min(position, line.text.length) - 1; at >= 0; at -= 1) {
    if (!SPACE.test(line.text[at])) return Number(line.marks[at]);
  }
  return 0;
}

// Whether all the writing between two places in a line has a style.
export function rangeHas(line: ParsedLine, start: number, end: number, style: number): boolean {
  let any = false;
  for (let at = Math.min(start, end); at < Math.max(start, end) && at < line.text.length; at += 1) {
    if (SPACE.test(line.text[at])) continue;
    if ((Number(line.marks[at]) & style) === 0) return false;
    any = true;
  }
  return any;
}

export type Edit = {
  body: string;
  // The line that should hold the cursor after the edit.
  focus: number;
  // Where in that line the cursor is expected to be.
  cursor: number;
};

// The user typed in a line: `typed` is the line's new text. What is new in it takes `style`,
// or the style of the writing before it when none is given. Text with line breaks (Enter, or
// a paste) becomes several lines; a list carries on to the next line, and Enter on an empty
// list item ends the list.
export function editLine(body: string, index: number, typed: string, style?: number | null): Edit {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return { body, focus: index, cursor: 0 };

  // What changed: everything between the part both texts start with and the part both end with.
  const old = current.text;
  let head = 0;
  while (head < old.length && head < typed.length && old[head] === typed[head]) head += 1;
  let tail = 0;
  while (
    tail < old.length - head &&
    tail < typed.length - head &&
    old[old.length - 1 - tail] === typed[typed.length - 1 - tail]
  ) {
    tail += 1;
  }
  const added = typed.length - head - tail;
  const marks =
    current.marks.slice(0, head) +
    String(style ?? styleAt(current, head)).repeat(added) +
    current.marks.slice(old.length - tail);

  const parts = typed.split('\n');
  if (parts.length === 1) {
    lines[index] = { ...current, text: typed, marks };
    return { body: build(lines), focus: index, cursor: head + added };
  }

  const isList = LIST_KINDS.includes(current.kind);
  if (isList && parts.length === 2 && parts[0] === '' && parts[1] === '') {
    lines[index] = { kind: 'text', text: '', marks: '' };
    return { body: build(lines), focus: index, cursor: 0 };
  }

  const nextKind: LineKind = !isList ? 'text' : current.kind === 'done' ? 'todo' : current.kind;
  let offset = 0;
  const pieces = parts.map((text) => {
    const piece = { text, marks: marks.slice(offset, offset + text.length) };
    offset += text.length + 1;
    return piece;
  });
  const rest = pieces.slice(1).map((piece) => ({ kind: nextKind, ...piece }));
  lines.splice(index, 1, { ...current, ...pieces[0] }, ...rest);
  // The cursor stays just before whatever followed it.
  const last = pieces[pieces.length - 1].text.length;
  return { body: build(lines), focus: index + rest.length, cursor: Math.max(0, last - tail) };
}

// Backspace at the start of a line: a heading or list item becomes plain text first; a plain
// line joins the one above it.
export function joinWithPrevious(
  body: string,
  index: number,
): { body: string; focus: number; cursor: number | null } {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return { body, focus: index, cursor: null };
  if (current.kind !== 'text') {
    lines[index] = { ...current, kind: 'text' };
    return { body: build(lines), focus: index, cursor: 0 };
  }
  if (index === 0) return { body, focus: 0, cursor: null };
  const previous = lines[index - 1];
  lines.splice(index - 1, 2, {
    kind: previous.kind,
    text: previous.text + current.text,
    marks: previous.marks + current.marks,
  });
  return { body: build(lines), focus: index - 1, cursor: previous.text.length };
}

// A toolbar button: gives the line that style, or takes it away when it already has it.
export function toggleLineKind(body: string, index: number, kind: LineKind): string {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return body;
  const same = current.kind === kind || (kind === 'todo' && current.kind === 'done');
  lines[index] = { ...current, kind: same ? 'text' : kind };
  return build(lines);
}

// Bold or italic for the selected part of a line. When all of it already has the style, the
// style is taken away instead. The text itself does not change.
export function toggleStyle(
  body: string,
  index: number,
  start: number,
  end: number,
  style: number,
): string {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return body;
  const from = Math.max(0, Math.min(start, end));
  const to = Math.min(current.text.length, Math.max(start, end));
  if (from >= to) return body;
  const remove = rangeHas(current, from, to, style);
  const changed = Array.from(current.marks.slice(from, to), (mark) =>
    String(remove ? Number(mark) & ~style : Number(mark) | style),
  ).join('');
  lines[index] = {
    ...current,
    marks: current.marks.slice(0, from) + changed + current.marks.slice(to),
  };
  return build(lines);
}

export type Span = { text: string; bold: boolean; italic: boolean };

// Splits a line into runs for drawing. Joined together the runs are exactly the line's text.
export function styledSpans(line: ParsedLine): Span[] {
  const spans: Span[] = [];
  let from = 0;
  while (from < line.text.length) {
    let to = from + 1;
    while (to < line.text.length && line.marks[to] === line.marks[from]) to += 1;
    const style = Number(line.marks[from]);
    spans.push({
      text: line.text.slice(from, to),
      bold: (style & BOLD) !== 0,
      italic: (style & ITALIC) !== 0,
    });
    from = to;
  }
  return spans;
}
