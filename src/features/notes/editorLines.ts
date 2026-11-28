// The note editor works on one line of Markdown at a time (design.md: a note is stored as
// Markdown, with checklists as task items). These are the edits it makes. Pure functions: no
// database, no UI.

export type LineKind = 'text' | 'title' | 'heading' | 'bullet' | 'number' | 'todo' | 'done';

export type ParsedLine = { kind: LineKind; text: string };

const PATTERNS: [LineKind, RegExp][] = [
  ['todo', /^- \[ \] ?/],
  ['done', /^- \[[xX]\] ?/],
  ['title', /^# /],
  ['heading', /^#{2,6} /],
  ['bullet', /^[-*+] /],
  ['number', /^\d+[.)] /],
];

const LIST_KINDS: LineKind[] = ['bullet', 'number', 'todo', 'done'];

export function parseLine(line: string): ParsedLine {
  for (const [kind, pattern] of PATTERNS) {
    const match = pattern.exec(line);
    if (match) return { kind, text: line.slice(match[0].length) };
  }
  return { kind: 'text', text: line };
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
    .map(({ kind, text }) => {
      count = kind === 'number' ? count + 1 : 0;
      return marker(kind, count) + text;
    })
    .join('\n');
}

export function parseBody(body: string): ParsedLine[] {
  return body.split('\n').map(parseLine);
}

export type Edit = {
  body: string;
  // The line that should hold the cursor after the edit.
  focus: number;
};

// The user typed in a line. Text with line breaks (Enter, or a paste) becomes several lines;
// a list carries on to the next line, and Enter on an empty list item ends the list.
export function editLine(body: string, index: number, typed: string): Edit {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return { body, focus: index };

  const parts = typed.split('\n');
  if (parts.length === 1) {
    lines[index] = { ...current, text: typed };
    return { body: build(lines), focus: index };
  }

  const isList = LIST_KINDS.includes(current.kind);
  if (isList && parts.length === 2 && parts[0] === '' && parts[1] === '') {
    lines[index] = { kind: 'text', text: '' };
    return { body: build(lines), focus: index };
  }

  const nextKind: LineKind = !isList ? 'text' : current.kind === 'done' ? 'todo' : current.kind;
  const added = parts.slice(1).map((text) => ({ kind: nextKind, text }));
  lines.splice(index, 1, { ...current, text: parts[0] }, ...added);
  return { body: build(lines), focus: index + added.length };
}

// Backspace at the start of a line: a heading or list item becomes plain text first; a plain
// line joins the one above it.
export function joinWithPrevious(body: string, index: number): Edit & { cursor: number | null } {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return { body, focus: index, cursor: null };
  if (current.kind !== 'text') {
    lines[index] = { kind: 'text', text: current.text };
    return { body: build(lines), focus: index, cursor: 0 };
  }
  if (index === 0) return { body, focus: 0, cursor: null };
  const previous = lines[index - 1];
  lines.splice(index - 1, 2, { ...previous, text: previous.text + current.text });
  return { body: build(lines), focus: index - 1, cursor: previous.text.length };
}

// A toolbar button: gives the line that style, or takes it away when it already has it.
export function toggleLineKind(body: string, index: number, kind: LineKind): string {
  const lines = parseBody(body);
  const current = lines[index];
  if (!current) return body;
  const same = current.kind === kind || (kind === 'todo' && current.kind === 'done');
  lines[index] = { kind: same ? 'text' : kind, text: current.text };
  return build(lines);
}

// Bold ("**") or italic ("*") around the selected part of a line, or around the whole line
// when nothing is selected. Doing it again takes the marks away.
export function toggleEmphasis(text: string, start: number, end: number, mark: '**' | '*'): string {
  const from = start === end ? 0 : Math.min(start, end);
  const to = start === end ? text.length : Math.max(start, end);
  const selected = text.slice(from, to);
  if (selected.trim() === '') return text;
  const wrapped =
    selected.length >= mark.length * 2 + 1 &&
    selected.startsWith(mark) &&
    selected.endsWith(mark) &&
    (mark === '**' || !selected.startsWith('**'));
  const replaced = wrapped
    ? selected.slice(mark.length, selected.length - mark.length)
    : `${mark}${selected}${mark}`;
  return text.slice(0, from) + replaced + text.slice(to);
}

export type Span = { text: string; bold: boolean; italic: boolean; mark: boolean };

const EMPHASIS = /(\*\*)(?=\S)(.+?)(?<=\S)\*\*|(\*)(?=\S)([^*]+?)(?<=\S)\*/g;

// Splits a line into runs for drawing: the bold and italic parts, and their marks, which the
// editor shows faintly. Joined together the runs are exactly the line's text.
export function emphasisSpans(text: string): Span[] {
  const spans: Span[] = [];
  const plain = (value: string) => {
    if (value) spans.push({ text: value, bold: false, italic: false, mark: false });
  };
  let last = 0;
  for (const match of text.matchAll(EMPHASIS)) {
    const bold = match[1] !== undefined;
    const mark = bold ? '**' : '*';
    const inner = bold ? match[2] : match[4];
    plain(text.slice(last, match.index));
    spans.push({ text: mark, bold: false, italic: false, mark: true });
    spans.push({ text: inner, bold, italic: !bold, mark: false });
    spans.push({ text: mark, bold: false, italic: false, mark: true });
    last = match.index + match[0].length;
  }
  plain(text.slice(last));
  return spans;
}
