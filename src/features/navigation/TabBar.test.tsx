// The bottom bar shows which screen is open and moves between them (R6.5).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';

import { initI18n } from '../../i18n';
import { lightColors } from '../../ui/tokens';
import { BAR_HEIGHT, TabBar } from './TabBar';

const layout = { nativeEvent: { layout: { width: 390, height: BAR_HEIGHT, x: 0, y: 0 } } };

describe('TabBar', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('has Home, Map, and Settings, and marks the open one', async () => {
    await render(<TabBar activeIndex={1} onSelect={() => {}} />);
    const names = screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel);
    expect(names).toEqual(['Go to Home', 'Show all pins on the map', 'Open Settings']);
    expect(screen.getByRole('tab', { name: 'Show all pins on the map' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Go to Home' })).not.toBeSelected();
  });

  it('colors the open tab and puts a highlight behind it, with room above and below', async () => {
    const view = await render(<TabBar activeIndex={0} onSelect={() => {}} />);
    await fireEvent(view.root!, 'layout', layout);
    const highlight = StyleSheet.flatten(screen.getByTestId('tab-highlight').props.style);
    expect(highlight.backgroundColor).toBe(lightColors.tealSoft);
    expect(highlight.top).toBeGreaterThanOrEqual(12);
    expect(highlight.top + highlight.height).toBeLessThanOrEqual(BAR_HEIGHT - 12);
    const drawn = JSON.stringify(screen.toJSON());
    expect(drawn).toContain(`"tintColor":${String(processColor(lightColors.accent))}`);
    expect(drawn).toContain(`"tintColor":${String(processColor(lightColors.mutedText))}`);
  });

  it('reports the tab that was tapped', async () => {
    const onSelect = jest.fn();
    await render(<TabBar activeIndex={0} onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Open Settings' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
