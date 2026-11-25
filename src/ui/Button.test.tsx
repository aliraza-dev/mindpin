import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from './Button';
import { tokens } from './tokens';

describe('Button (non-functional: accessibility)', () => {
  it('exposes its accessibility label and button role', async () => {
    await render(<Button label="Save" accessibilityLabel="Save this place" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Save this place' })).toBeTruthy();
  });

  it('has a touch area of at least 44 px', async () => {
    await render(<Button label="Go" accessibilityLabel="Go" onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(tokens.minTouchTarget);
    expect(style.minWidth).toBeGreaterThanOrEqual(tokens.minTouchTarget);
    expect(tokens.minTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" accessibilityLabel="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" accessibilityLabel="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
