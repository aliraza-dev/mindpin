// A row that slides aside for its actions (R10.11, R3.13, R4.4).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { SwipeRow } from './SwipeRow';

describe('SwipeRow', () => {
  it('keeps its actions out of sight while closed, and still lets them be pressed', async () => {
    const onPress = jest.fn();
    await render(
      <SwipeRow
        actions={[{ key: 'delete', icon: 'trash', accessibilityLabel: 'Delete it', onPress }]}
      >
        <Text>Row</Text>
      </SwipeRow>,
    );
    const actions = screen.getByTestId('swipe-actions');
    expect(StyleSheet.flatten(actions.props.style).opacity).toBe(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete it' }));
    expect(onPress).toHaveBeenCalled();
  });
});
