// A note is stored as Markdown (design.md), and the rich editor (react-native-enriched-html)
// reads and writes its own small HTML. These turn one into the other. Only the styles a note
// can have are carried: headings, bold, italic, and bulleted, numbered, and checkbox lists.
// Anything else in the editor's HTML is kept as its plain text. Pure: no UI, no database.
import { buildBody, parseBody, BOLD, ITALIC, type LineKind, type ParsedLine } from './editorLines';

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const OPEN = ['', '<b>', '<i>', '<b><i>'];
const CLOSE = ['', '</b>', '</i>', '</i></b>'];

function inlineHtml(line: ParsedLine): string {
  let out = '';
  let from = 0;
  while (from < line.text.length) {
    let to = from + 1;
    while (to < line.text.length && line.marks[to] === line.marks[from]) to += 1;
    const style = Number(line.marks[from]) & (BOLD | ITALIC);
    out += OPEN[style] + escapeHtml(line.text.slice(from, to)) + CLOSE[style];
    from = to;
  }
  return out;
}

const LIST_OPEN: Partial<Record<LineKind, string>> = {
  bullet: '<ul>',
  number: '<ol>',
  todo: '<ul data-type="checkbox">',
  done: '<ul data-type="checkbox">',
};

// The editor's HTML for a note's Markdown.
export function markdownToHtml(body: string): string {
  const out: string[] = [];
  let list: string | null = null;
  const close = () => {
    if (list) out.push(list === '<ol>' ? '</ol>' : '</ul>');
    list = null;
  };
  for (const line of parseBody(body)) {
    const open = LIST_OPEN[line.kind] ?? null;
    if (open !== list) {
      close();
      if (open) out.push(open);
      list = open;
    }
    const inner = inlineHtml(line);
    if (open) out.push(line.kind === 'done' ? `<li checked>${inner}</li>` : `<li>${inner}</li>`);
    else if (line.kind === 'title') out.push(`<h1>${inner}</h1>`);
    else if (line.kind === 'heading') out.push(`<h2>${inner}</h2>`);
    else out.push(inner === '' ? '<br>' : `<p>${inner}</p>`);
  }
  close();
  return `<html>\n${out.join('\n')}\n</html>`;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decode(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name] ?? whole;
    const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    // A code that is not a character is left as it was written.
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
// Tags that hold one line of the note each.
const LINE_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']);

// The Markdown for the editor's HTML.
export function htmlToMarkdown(html: string): string {
  const lines: ParsedLine[] = [];
  let list: LineKind | null = null;
  let current: ParsedLine | null = null;
  let bold = 0;
  let italic = 0;
  let last = 0;

  const write = (raw: string) => {
    if (!current) return;
    const text = decode(raw).replace(/[​\n\r]/g, '');
    current.text += text;
    current.marks += String((bold > 0 ? BOLD : 0) | (italic > 0 ? ITALIC : 0)).repeat(text.length);
  };
  const end = () => {
    if (current) lines.push(current);
    current = null;
  };

  for (const match of html.matchAll(TAG)) {
    write(html.slice(last, match.index));
    last = match.index + match[0].length;
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    const attributes = match[3];

    if (tag === 'b' || tag === 'strong') bold = Math.max(0, bold + (closing ? -1 : 1));
    else if (tag === 'i' || tag === 'em') italic = Math.max(0, italic + (closing ? -1 : 1));
    else if (tag === 'ul' || tag === 'ol') {
      end();
      if (closing) list = null;
      else if (tag === 'ol') list = 'number';
      else list = /data-type\s*=\s*["']?checkbox/i.test(attributes) ? 'todo' : 'bullet';
    } else if (tag === 'br') {
      // Inside a line a break ends it; on its own it is an empty line.
      if (current) {
        const kind: LineKind = current.kind;
        end();
        current = { kind: kind === 'done' ? 'todo' : kind, text: '', marks: '' };
      } else lines.push({ kind: 'text', text: '', marks: '' });
    } else if (LINE_TAGS.has(tag)) {
      end();
      if (closing) continue;
      let kind: LineKind = 'text';
      if (tag === 'h1') kind = 'title';
      else if (tag[0] === 'h') kind = 'heading';
      else if (tag === 'li' && list) {
        kind = list === 'todo' && /(^|\s)checked(\s|=|$)/i.test(attributes) ? 'done' : list;
      }
      current = { kind, text: '', marks: '' };
    }
  }
  end();
  if (lines.length === 0) return '';
  return buildBody(lines);
}
