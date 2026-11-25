import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';

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
});
