// The note editor on the phone's rich-text engine (R10.3, R10.4). The engine itself is native
// and needs a real phone; here a stand-in records what the editor is given and asked to do.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useImperativeHandle } from 'react';
import { View } from 'react-native';
import type { EnrichedTextInputProps } from 'react-native-enriched-html';

import { initI18n } from '../../i18n';
import { RichNoteEditor } from './RichNoteEditor';

const calls: string[] = [];

function FakeInput({ ref, style: _style, ...rest }: EnrichedTextInputProps) {
  useImperativeHandle(ref as never, () => ({
    toggleBold: () => calls.push('bold'),
    toggleItalic: () => calls.push('italic'),
    toggleH1: () => calls.push('h1'),
    toggleH2: () => calls.push('h2'),
    toggleUnorderedList: () => calls.push('ul'),
    toggleOrderedList: () => calls.push('ol'),
    toggleCheckboxList: (checked: boolean) => calls.push(`checkbox:${checked}`),
  }));
  return <View {...(rest as object)} />;
}

function setup(initialBody = '') {
  const onChange = jest.fn();
  const onBack = jest.fn();
  const view = render(
    <RichNoteEditor
      Input={FakeInput}
      initialBody={initialBody}
      autoFocus
      editedAt={new Date(2026, 10, 28, 19, 10).getTime()}
      onChange={onChange}
      onBack={onBack}
      onLink={jest.fn()}
    />,
  );
  return { view, onChange, onBack };
}

const input = () => screen.getByTestId('rich-note');
const tool = (name: string) => screen.getByRole('button', { name });
const type = (html: string) =>
  act(async () => {
    input().props.onChangeHtml({ nativeEvent: { value: html } });
  });

describe('RichNoteEditor', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    calls.length = 0;
  });

  it('opens the note in the editor as HTML, with the keyboard up for a new note', async () => {
    await setup('# Trip\ngate **code**').view;
    expect(input().props.defaultValue).toBe(
      '<html>\n<h1>Trip</h1>\n<p>gate <b>code</b></p>\n</html>',
    );
    expect(input().props.autoFocus).toBe(true);
    expect(input().props.placeholder).toBe('Start writing');
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('hands every change on as Markdown, once', async () => {
    const { view, onChange } = setup('Trip');
    await view;
    await type('<html>\n<p>Trip</p>\n</html>');
    expect(onChange).not.toHaveBeenCalled();
    await type(
      '<html>\n<p>Trip</p>\n<ul data-type="checkbox">\n<li checked>Sweets</li>\n</ul>\n</html>',
    );
    expect(onChange).toHaveBeenLastCalledWith('Trip\n- [x] Sweets');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('asks the editor for the style of each toolbar button', async () => {
    await setup('Trip').view;
    for (const name of [
      'Title',
      'Heading',
      'Bold',
      'Italic',
      'Bulleted list',
      'Numbered list',
      'Checklist',
    ]) {
      await fireEvent.press(tool(name));
    }
    expect(calls).toEqual(['h1', 'h2', 'bold', 'italic', 'ul', 'ol', 'checkbox:false']);
  });

  it('lights the buttons of the styles in use at the cursor', async () => {
    await setup('Trip').view;
    expect(tool('Bold')).not.toBeSelected();
    const off = { isActive: false, isConflicting: false, isBlocking: false };
    const on = { ...off, isActive: true };
    await act(async () => {
      input().props.onChangeState({
        nativeEvent: { bold: on, italic: off, h1: off, h2: on, checkboxList: on },
      });
    });
    expect(tool('Bold')).toBeSelected();
    expect(tool('Heading')).toBeSelected();
    expect(tool('Checklist')).toBeSelected();
    expect(tool('Italic')).not.toBeSelected();
    expect(tool('Title')).not.toBeSelected();
  });

  it('does not store a note over the limit, and says so', async () => {
    const { view, onChange } = setup('');
    await view;
    await type(`<html>\n<p>${'a'.repeat(20_001)}</p>\n</html>`);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('goes back from the back button', async () => {
    const { view, onBack } = setup('Trip');
    await view;
    await fireEvent.press(tool('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
