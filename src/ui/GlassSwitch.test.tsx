// The frosted-glass change between the People and Places lists on Home.
import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text } from 'react-native';

import { GlassSwitch } from './GlassSwitch';

const HIDDEN = { includeHiddenElements: true };
const show = (key: string) => (
  <GlassSwitch switchKey={key} direction={1}>
    <Text>{key} list</Text>
  </GlassSwitch>
);

describe('GlassSwitch', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows its content and keeps the glass away from screen readers and touches', async () => {
    await render(show('people'));
    expect(screen.getByText('people list')).toBeTruthy();
    const pane = screen.getByTestId('glass-pane', HIDDEN);
    expect(pane.props.pointerEvents).toBe('none');
    expect(screen.queryByTestId('glass-pane')).toBeNull();
  });

  it('does not animate when the screen first appears', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await render(show('people'));
    expect(timing).not.toHaveBeenCalled();
  });

  it('plays when the content changes', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await render(show('people'));
    await view.rerender(show('places'));
    expect(screen.getByText('places list')).toBeTruthy();
    await waitFor(() => expect(timing).toHaveBeenCalledTimes(1));
  });

  it('simply changes the content when the phone is set to reduce motion', async () => {
    const reduced = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await render(show('people'));
    await view.rerender(show('places'));
    await waitFor(() => expect(reduced).toHaveBeenCalled());
    expect(screen.getByText('places list')).toBeTruthy();
    expect(timing).not.toHaveBeenCalled();
  });
});
