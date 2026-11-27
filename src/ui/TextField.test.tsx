import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TextField } from './TextField';
import { tokens } from './tokens';

describe('TextField', () => {
  it('shows its label and is announced by it', async () => {
    await render(<TextField label="Notes for next time" value="" onChangeText={() => {}} />);
    expect(screen.getByText('Notes for next time')).toBeTruthy();
    expect(screen.getByLabelText('Notes for next time')).toBeTruthy();
  });

  it('reports typed text', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Name" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ahmed');
    expect(onChangeText).toHaveBeenCalledWith('Ahmed');
  });

  it('is at least 44 px high, as designed (46 px)', async () => {
    await render(<TextField label="Name" value="" onChangeText={() => {}} />);
    const style = StyleSheet.flatten(screen.getByLabelText('Name').props.style);
    expect(style.minHeight).toBe(tokens.size.input);
    expect(style.minHeight).toBeGreaterThanOrEqual(tokens.minTouchTarget);
  });

  it('shows an accent border while it is being typed in', async () => {
    await render(<TextField label="Name" value="" onChangeText={() => {}} />);
    const input = screen.getByLabelText('Name');
    expect(StyleSheet.flatten(input.props.style).borderColor).toBe(tokens.color.controlBorder);
    await fireEvent(input, 'focus');
    expect(StyleSheet.flatten(screen.getByLabelText('Name').props.style).borderColor).toBe(tokens.color.accent);
    await fireEvent(screen.getByLabelText('Name'), 'blur');
    expect(StyleSheet.flatten(screen.getByLabelText('Name').props.style).borderColor).toBe(tokens.color.controlBorder);
  });

  it('shows a hint under the field and reads it out with the field', async () => {
    await render(<TextField label="Tags" hint="Separate tags with commas" value="" onChangeText={() => {}} />);
    expect(screen.getByText('Separate tags with commas')).toBeTruthy();
    expect(screen.getByLabelText('Tags').props.accessibilityHint).toBe('Separate tags with commas');
  });

  it('shows an error in place of the hint, announced as an alert', async () => {
    await render(
      <TextField label="Name" hint="As you know them" error="Type a name." value="" onChangeText={() => {}} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Type a name.');
    expect(screen.queryByText('As you know them')).toBeNull();
    expect(screen.getByLabelText('Name').props.accessibilityHint).toBe('Type a name.');
  });
});
