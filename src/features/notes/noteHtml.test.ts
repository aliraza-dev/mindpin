// The note's Markdown and the rich editor's HTML (R10.4).
import { sortChecklists } from './editorLines';
import { htmlToMarkdown, markdownToHtml } from './noteHtml';

const NOTE = [
  '# Trip',
  '## Packing',
  'Take the **blue** bag and *ring* twice',
  '',
  '- Sweets',
  '- Fruit',
  '1. First',
  '2. Second',
  '- [ ] Call',
  '- [x] ***Book***',
  'a < b & c',
].join('\n');

describe('markdownToHtml', () => {
  it('writes each kind of line as the editor expects it', () => {
    expect(markdownToHtml(NOTE)).toBe(
      [
        '<html>',
        '<h1>Trip</h1>',
        '<h2>Packing</h2>',
        '<p>Take the <b>blue</b> bag and <i>ring</i> twice</p>',
        '<br>',
        '<ul>',
        '<li>Sweets</li>',
        '<li>Fruit</li>',
        '</ul>',
        '<ol>',
        '<li>First</li>',
        '<li>Second</li>',
        '</ol>',
        '<ul data-type="checkbox">',
        '<li>Call</li>',
        '<li checked><b><i>Book</i></b></li>',
        '</ul>',
        '<p>a &lt; b &amp; c</p>',
        '</html>',
      ].join('\n'),
    );
  });

  it('writes an empty note as one empty line', () => {
    expect(markdownToHtml('')).toBe('<html>\n<br>\n</html>');
  });

  it('never lets typed text become a tag', () => {
    expect(markdownToHtml('<script>alert(1)</script>')).toBe(
      '<html>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n</html>',
    );
  });
});

describe('htmlToMarkdown', () => {
  it('reads back exactly the note that was written', () => {
    expect(htmlToMarkdown(markdownToHtml(NOTE))).toBe(NOTE);
    expect(htmlToMarkdown(markdownToHtml(''))).toBe('');
    expect(htmlToMarkdown(markdownToHtml('one\n\n\ntwo'))).toBe('one\n\n\ntwo');
  });

  it('reads the HTML the editor itself writes', () => {
    const html =
      '<html>\n<h1>Trip</h1>\n<p>gate <b>code</b>&nbsp; 4471</p>\n<br>\n' +
      '<ul data-type="checkbox">\n<li checked>Sweets</li>\n<li>Fruit &amp; nuts</li>\n</ul>\n' +
      '<ol>\n<li>One</li>\n<li>Two</li>\n</ol>\n</html>';
    expect(htmlToMarkdown(html)).toBe(
      '# Trip\ngate **code**  4471\n\n- [x] Sweets\n- [ ] Fruit & nuts\n1. One\n2. Two',
    );
  });

  it('keeps the text of styles a note does not have', () => {
    const html =
      '<html>\n<h3>Small</h3>\n<p><u>under</u> <s>struck</s> <code>code</code> ' +
      '<a href="https://example.com">link</a></p>\n<blockquote>\n<p>quoted</p>\n</blockquote>\n</html>';
    expect(htmlToMarkdown(html)).toBe('## Small\nunder struck code link\nquoted');
  });

  it('decodes character codes, and keeps an asterisk as an asterisk', () => {
    expect(htmlToMarkdown('<html>\n<p>2 * 3 &#128512; &#x41;</p>\n</html>')).toBe(
      '2 \\* 3 \u{1F600} A',
    );
  });

  it('is empty for an empty editor', () => {
    expect(htmlToMarkdown('<html>\n<p></p>\n</html>')).toBe('');
    expect(htmlToMarkdown('')).toBe('');
  });
});

describe('sortChecklists', () => {
  it('moves ticked items below the unticked ones of the same checklist (R10.5)', () => {
    expect(sortChecklists('- [x] A\n- [ ] B\n- [x] C\n- [ ] D')).toBe(
      '- [ ] B\n- [ ] D\n- [x] A\n- [x] C',
    );
    // Two checklists with a line between them are sorted apart.
    expect(sortChecklists('- [x] A\n- [ ] B\ntext\n- [x] C\n- [ ] D')).toBe(
      '- [ ] B\n- [x] A\ntext\n- [ ] D\n- [x] C',
    );
    expect(sortChecklists('Trip\n- Sweets')).toBe('Trip\n- Sweets');
  });
});
