// T068: the note editor (R10.1, R10.3, R10.4, R10.5).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { initI18n } from '../../i18n';
import { NOTE_LIMIT, NoteEditor } from './NoteEditor';

function setup(initialBody = '', autoFocus = true) {
  const onChange = jest.fn();
  const onBack = jest.fn();
  const onLink = jest.fn();
  const view = render(
    <NoteEditor
      initialBody={initialBody}
      autoFocus={autoFocus}
      editedAt={new Date(2026, 10, 28, 19, 10).getTime()}
      onChange={onChange}
      onBack={onBack}
      onLink={onLink}
    />,
  );
  return { view, onChange, onBack, onLink };
}

const first = () => screen.getByLabelText('Note title, line 1');
const line = (number: number) => screen.getByLabelText(`Line ${number}`);
const tool = (name: string) => screen.getByRole('button', { name });

describe('NoteEditor', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('opens blank with the keyboard up and no Save button (R10.1, R10.3)', async () => {
    await setup().view;
    expect(first().props.autoFocus).toBe(true);
    expect(first().props.placeholder).toBe('Start writing');
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('does not take the keyboard when an existing note is opened', async () => {
    await setup('Gate code', false).view;
    expect(first().props.autoFocus).toBe(false);
  });

  it('hands over every change as the user types (R10.3)', async () => {
    const { view, onChange } = setup();
    await view;
    await fireEvent.changeText(first(), 'Gate');
    await fireEvent.changeText(first(), 'Gate code');
    expect(onChange.mock.calls.map(([body]) => body)).toEqual(['Gate', 'Gate code']);
  });

  it('starts a new line on Enter and carries a checklist on (R10.4)', async () => {
    const { view, onChange } = setup('Shopping\n- [ ] Sweets');
    await view;
    await fireEvent.changeText(line(2), 'Sweets\n');
    expect(onChange).toHaveBeenLastCalledWith('Shopping\n- [ ] Sweets\n- [ ] ');
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('makes headings and lists from the toolbar (R10.4)', async () => {
    const { view, onChange } = setup('Trip\nPacking');
    await view;
    await fireEvent(line(2), 'focus');
    await fireEvent.press(tool('Heading'));
    expect(onChange).toHaveBeenLastCalledWith('Trip\n## Packing');
    await fireEvent.press(tool('Bulleted list'));
    expect(onChange).toHaveBeenLastCalledWith('Trip\n- Packing');
    await fireEvent.press(tool('Numbered list'));
    expect(onChange).toHaveBeenLastCalledWith('Trip\n1. Packing');
    await fireEvent.press(tool('Checklist'));
    expect(onChange).toHaveBeenLastCalledWith('Trip\n- [ ] Packing');
    await fireEvent(first(), 'focus');
    await fireEvent.press(tool('Title'));
    expect(onChange).toHaveBeenLastCalledWith('# Trip\n- [ ] Packing');
  });

  it('makes the selected words bold or italic (R10.4)', async () => {
    const { view, onChange } = setup('Trip\ngate code 4471');
    await view;
    await fireEvent(line(2), 'focus');
    await fireEvent(line(2), 'selectionChange', {
      nativeEvent: { selection: { start: 5, end: 9 } },
    });
    await fireEvent.press(tool('Bold'));
    expect(onChange).toHaveBeenLastCalledWith('Trip\ngate **code** 4471');
    await fireEvent(line(2), 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 4 } },
    });
    await fireEvent.press(tool('Italic'));
    expect(onChange).toHaveBeenLastCalledWith('Trip\n*gate* **code** 4471');
  });

  it('ticks a checklist item with its circle and moves it to the bottom (R10.4, R10.5)', async () => {
    const { view, onChange } = setup('- [ ] Sweets\n- [ ] Fruit');
    await view;
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tick Sweets' }));
    expect(onChange).toHaveBeenLastCalledWith('- [ ] Fruit\n- [x] Sweets');
    expect(screen.getByRole('checkbox', { name: 'Untick Sweets' })).toBeChecked();
  });

  it('joins a line with the one above on Backspace at its start', async () => {
    const { view, onChange } = setup('One\nTwo');
    await view;
    await fireEvent(line(2), 'focus');
    await fireEvent(line(2), 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 0 } },
    });
    await fireEvent(line(2), 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(onChange).toHaveBeenLastCalledWith('OneTwo');
    expect(screen.queryByLabelText('Line 2')).toBeNull();
  });

  it('refuses text beyond the limit and says so', async () => {
    const { view, onChange } = setup();
    await view;
    await fireEvent.changeText(first(), 'x'.repeat(NOTE_LIMIT + 1));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This note is full. Start a new note for the rest.',
    );
  });

  it('reports Back and Link', async () => {
    const { view, onBack, onLink } = setup('Note');
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Link this note to a person or place' }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onLink).toHaveBeenCalledTimes(1);
  });

  it('looks like ruled paper, with the date above the note', async () => {
    await setup('Trip\nPacking').view;
    expect(screen.getByText(/2026/)).toBeTruthy();
    const rules = screen.getByTestId('note-rules', { includeHiddenElements: true });
    expect(rules.props.children.length).toBeGreaterThanOrEqual(20);
    // Every row is the height of one rule, so the lines fall under the writing.
    const heights = [first(), line(2)].map(
      (input) => StyleSheet.flatten(input.props.style).lineHeight,
    );
    expect(heights).toEqual([32, 32]);
  });
});
