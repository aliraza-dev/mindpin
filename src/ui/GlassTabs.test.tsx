// The glass tabs (R6.3, R6.5). Dragging the lens needs a real phone; these tests check the
// tabs it sits over and how it is drawn once the row is measured.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import * as ReactNative from 'react-native';
import { StyleSheet } from 'react-native';

import type { ViewRef } from './blur';
import { GlassTabs, LENS_OVER, type GlassTab } from './GlassTabs';
import { lightColors } from './tokens';

// The native blur is not there in tests; a plain view stands in and keeps its props.
jest.mock('./blur', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ...jest.requireActual<typeof import('./blur')>('./blur'), BlurView: View };
});

const tabs: GlassTab[] = [
  { key: 'people', label: 'People', accessibilityLabel: 'Show people' },
  { key: 'places', label: 'Places', accessibilityLabel: 'Show places' },
  { key: 'notes', label: 'Notes', accessibilityLabel: 'Open notes' },
];
const icons: GlassTab[] = [
  { key: 'home', icon: 'navHome', label: 'Home', accessibilityLabel: 'Go to Home' },
  { key: 'map', icon: 'navMap', label: 'Map', accessibilityLabel: 'Show the map' },
];
const layout = { nativeEvent: { layout: { width: 308, height: 48, x: 0, y: 0 } } };
const HIDDEN = { includeHiddenElements: true };
const measure = () => fireEvent(screen.getByTestId('glass-measure', HIDDEN), 'layout', layout);
const lens = () => StyleSheet.flatten(screen.getByTestId('glass-lens', HIDDEN).props.style);
const capsule = () =>
  StyleSheet.flatten(screen.getByTestId('glass-measure', HIDDEN).parent!.props.style);

describe('GlassTabs', () => {
  it('marks the open tab and reports a tap on another', async () => {
    const onSelect = jest.fn();
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Show people' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Show places' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Open notes' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('draws a lens larger than the capsule once the row is measured, clear of touches', async () => {
    await render(<GlassTabs tabs={tabs} activeIndex={1} onSelect={() => {}} height={48} />);
    expect(screen.queryByTestId('glass-lens', HIDDEN)).toBeNull();
    await measure();
    // One tab wide, and reaching past the capsule on every side.
    expect(lens().width).toBe(100 + LENS_OVER * 2);
    expect(lens().height).toBe(48 + LENS_OVER * 2);
    expect(lens().top).toBeLessThan(0);
    expect(screen.getByTestId('glass-lens', HIDDEN).props.pointerEvents).toBe('none');
  });

  it('is clear glass with no drop shadow, so the capsule shows through', async () => {
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} />);
    await measure();
    expect(lens().backgroundColor).toMatch(/^rgba\(255, 255, 255, 0\.0\d+\)$/);
    expect(lens().elevation).toBeUndefined();
    expect(lens().shadowOpacity).toBeUndefined();
  });

  it('fills the capsule with the theme color when solid, and washes it when soft', async () => {
    const soft = await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} />);
    expect(capsule().backgroundColor).toBe(lightColors.tealSoft);
    await soft.unmount();
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} tone="solid" />);
    expect(capsule().backgroundColor).toBe(lightColors.accent);
  });

  it('is frosted glass over the screen behind when given one, and a flat fill when not', async () => {
    const flat = await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} />);
    expect(screen.queryByTestId('glass-frost', HIDDEN)).toBeNull();
    await flat.unmount();
    const behind = createRef<ViewRef>();
    await render(
      <GlassTabs
        tabs={tabs}
        activeIndex={0}
        onSelect={() => {}}
        tone="solid"
        blurTarget={behind}
      />,
    );
    expect(screen.getByTestId('glass-frost', HIDDEN).props.blurTarget).toBe(behind);
    expect(capsule().backgroundColor).toBe('transparent');
  });

  it('has no line of light on the lens in the dark theme', async () => {
    const light = await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} />);
    await measure();
    expect(screen.getByTestId('glass-glint', HIDDEN)).toBeTruthy();
    await light.unmount();
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} />);
    await measure();
    expect(screen.queryByTestId('glass-glint', HIDDEN)).toBeNull();
    jest.restoreAllMocks();
  });

  it('shows the name under the icon of the open tab only', async () => {
    await render(<GlassTabs tabs={icons} activeIndex={0} onSelect={() => {}} tone="solid" />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.queryByText('Map')).toBeNull();
  });

  it('keeps every tab at least 44 px high, and can be a row of screen-reader tabs', async () => {
    await render(<GlassTabs tabs={tabs} activeIndex={0} onSelect={() => {}} role="tab" />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(capsule().height).toBeGreaterThanOrEqual(44);
  });
});
