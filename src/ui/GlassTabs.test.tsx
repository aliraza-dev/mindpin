// The glass tabs (R6.3, R6.5). Dragging the bubble needs a real phone; these tests check the
// tabs it sits over and that it is drawn once the row is measured.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { GlassTabs, type GlassTab } from './GlassTabs';

const tabs: GlassTab[] = [
  { key: 'people', label: 'People', accessibilityLabel: 'Show people' },
  { key: 'places', label: 'Places', accessibilityLabel: 'Show places' },
  { key: 'notes', label: 'Notes', accessibilityLabel: 'Open notes' },
];
const layout = { nativeEvent: { layout: { width: 308, height: 48, x: 0, y: 0 } } };
const HIDDEN = { includeHiddenElements: true };

describe('GlassTabs', () => {
  it('marks the open tab and reports a tap on another', async () => {
    const onSelect = jest.fn();
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Show people' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Show places' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Open notes' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('draws the bubble one tab wide once the row is measured, out of the way of touches', async () => {
    await render(<GlassTabs tabs={tabs} activeIndex={1} onSelect={() => {}} />);
    expect(screen.queryByTestId('glass-bubble', HIDDEN)).toBeNull();
    await fireEvent(screen.getByTestId('glass-measure', HIDDEN), 'layout', layout);
    const bubble = screen.getByTestId('glass-bubble', HIDDEN);
    expect(StyleSheet.flatten(bubble.props.style).width).toBe(100);
    expect(bubble.props.pointerEvents).toBe('none');
  });

  it('keeps every tab at least 44 px high, and can be a row of screen-reader tabs', async () => {
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} role="tab" />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    const capsule = StyleSheet.flatten(screen.root!.props.style);
    expect(capsule.height).toBeGreaterThanOrEqual(44);
  });
});
