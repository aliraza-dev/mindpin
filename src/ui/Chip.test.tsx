import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Chip } from './Chip';
import { tokens } from './tokens';

describe('Chip', () => {
  it('reports its selected state to screen readers', async () => {
    await render(<Chip label="Shop" accessibilityLabel="Label: Shop" selected onPress={() => {}} />);
    const chip = screen.getByRole('button', { name: 'Label: Shop' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('has a touch area of at least 44 px and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Home" accessibilityLabel="Home" onPress={onPress} />);
    const chip = screen.getByRole('button');
    // The chip is drawn 36 px high; its touch area is extended above and below.
    const { height } = StyleSheet.flatten(chip.props.style);
    const { top, bottom } = chip.props.hitSlop;
    expect(height + top + bottom).toBeGreaterThanOrEqual(tokens.minTouchTarget);
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});
