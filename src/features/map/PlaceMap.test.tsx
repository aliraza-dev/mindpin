// T140: the map at the top of the place screen. The map itself is native, so tests use the
// stand-in from jest.setup.ts and check what it is asked to show.
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { tokens } from '../../ui/tokens';
import { PlaceMap } from './PlaceMap';

// The map is hidden from screen readers, so tests must ask for hidden elements to see it.
const MAP = { includeHiddenElements: true };

describe('PlaceMap', () => {
  it('centres the map on the place and drops one pin there', async () => {
    await render(<PlaceMap lat={31.5204} lng={74.3587} bottomInset={24} />);
    const map = screen.getByTestId('place-map', MAP);
    expect(map.props.region).toMatchObject({ latitude: 31.5204, longitude: 74.3587 });
    const pins = screen.getAllByTestId('map-pin', MAP);
    expect(pins).toHaveLength(1);
    expect(pins[0].props.coordinate).toEqual({ latitude: 31.5204, longitude: 74.3587 });
    expect(pins[0].props.pinColor).toBe(tokens.color.accent);
  });

  it('never asks for or shows where the user is (privacy rules)', async () => {
    await render(<PlaceMap lat={1} lng={2} bottomInset={24} />);
    const map = screen.getByTestId('place-map', MAP);
    expect(map.props.showsUserLocation).toBe(false);
    expect(map.props.showsMyLocationButton).toBe(false);
  });

  it('is a still picture: it cannot be moved, and taps pass through to the screen', async () => {
    await render(<PlaceMap lat={1} lng={2} bottomInset={24} />);
    expect(screen.getByTestId('place-map', MAP).props).toMatchObject({
      scrollEnabled: false,
      zoomEnabled: false,
      rotateEnabled: false,
      pitchEnabled: false,
      toolbarEnabled: false,
    });
    const frame = screen.getByTestId('place-map-frame', MAP);
    expect(StyleSheet.flatten(frame.props.style).pointerEvents).toBe('none');
  });

  it('is skipped by screen readers, since the address is in text below it', async () => {
    await render(<PlaceMap lat={1} lng={2} bottomInset={24} />);
    const frame = screen.getByTestId('place-map-frame', MAP);
    expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(frame.props.accessibilityElementsHidden).toBe(true);
  });

  it("keeps the map maker's logo clear of the sheet that overlaps the map", async () => {
    await render(<PlaceMap lat={1} lng={2} bottomInset={24} />);
    expect(screen.getByTestId('place-map', MAP).props.mapPadding).toEqual({
      top: 0,
      right: 0,
      bottom: 24,
      left: 0,
    });
  });
});
