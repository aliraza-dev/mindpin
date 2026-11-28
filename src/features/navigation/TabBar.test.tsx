// The bottom bar shows which screen is open and moves between them (R6.5).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';

import { initI18n } from '../../i18n';
import { lightColors } from '../../ui/tokens';
import { TabBar } from './TabBar';

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

  it('colors the icon of the open tab', async () => {
    await render(<TabBar activeIndex={0} onSelect={() => {}} />);
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
