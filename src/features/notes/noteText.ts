// Working with a note's text. A note is stored as Markdown, with checklists as task items
// such as "- [ ] Sweets" (design.md). Pure functions: no database, no UI.

const HEADING = /^\s*#{1,6}\s+/;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const CHECKBOX = /^\[[ xX]\]\s*/;
// A checklist item: indentation, a list marker, then a checkbox.
const CHECKLIST_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+\[([ xX])\]/;

// Shows a line as plain text: without its heading, list, or checkbox marker, or emphasis marks.
function plainText(line: string): string {
  return line
    .replace(HEADING, '')
    .replace(LIST_MARKER, '')
    .replace(CHECKBOX, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1$2')
    .replace(/(^|[^\w_])_([^_\s][^_]*?)_(?![\w_])/g, '$1$2')
    .trim();
}

function textLines(body: string): string[] {
  return body
    .split('\n')
    .map(plainText)
    .filter((line) => line !== '');
}

// The first line of a note is its title (R10.2). Empty for an empty note.
export function noteTitle(body: string): string {
  return textLines(body)[0] ?? '';
}

// The text after the first line, on one line, for lists (R10.2).
export function notePreview(body: string, maxLength = 140): string {
  return textLines(body).slice(1).join(' ').replace(/\s+/g, ' ').slice(0, maxLength).trimEnd();
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

// Ticks or unticks the checklist item on the given line (counting from 0) and returns the new
// note text. A ticked item moves to the bottom of its checklist (R10.5); an unticked item moves
// back above the ticked ones. An item's indented lines move with it. The text is returned
// unchanged when the line is not a checklist item.
export function toggleChecklistItem(body: string, lineIndex: number): string {
  const lines = body.split('\n');
  const match = CHECKLIST_ITEM.exec(lines[lineIndex] ?? '');
  if (!match) return body;
  const indent = match[1].length;
  const nowChecked = match[2] === ' ';

  // The checklist this item belongs to: neighbouring items at the same indentation, each with
  // any deeper-indented lines under it. A blank line or other text ends the checklist.
  const isSibling = (line: string) => indentOf(line) === indent && CHECKLIST_ITEM.test(line);
  const belongs = (line: string) =>
    line.trim() !== '' && (indentOf(line) > indent || isSibling(line));

  let start = lineIndex;
  while (start > 0 && belongs(lines[start - 1])) start--;
  while (!isSibling(lines[start])) start++;
  let end = lineIndex + 1;
  while (end < lines.length && belongs(lines[end])) end++;

  type Item = { lines: string[]; checked: boolean };
  const items: Item[] = [];
  let target: Item | null = null;
  for (let i = start; i < end; i++) {
    if (isSibling(lines[i])) {
      const checked = CHECKLIST_ITEM.exec(lines[i])?.[2] !== ' ';
      items.push({ lines: [lines[i]], checked });
      if (i === lineIndex) target = items[items.length - 1];
    } else {
      items[items.length - 1].lines.push(lines[i]);
    }
  }
  if (!target) return body;

  target.checked = nowChecked;
  target.lines[0] = target.lines[0].replace(/\[[ xX]\]/, nowChecked ? '[x]' : '[ ]');
  const others = items.filter((item) => item !== target);
  const firstChecked = others.findIndex((item) => item.checked);
  const position = nowChecked || firstChecked === -1 ? others.length : firstChecked;
  others.splice(position, 0, target);

  return [
    ...lines.slice(0, start),
    ...others.flatMap((item) => item.lines),
    ...lines.slice(end),
  ].join('\n');
}
