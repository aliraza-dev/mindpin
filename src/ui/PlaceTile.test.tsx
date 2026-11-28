// The square beside a place (R6.3).
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PlaceTile } from './PlaceTile';
import { lightColors } from './tokens';

const HIDDEN = { includeHiddenElements: true };

describe('PlaceTile', () => {
  it('shows a map pin on a tinted square for a place with no icon of its own', async () => {
    await render(<PlaceTile label="Gulberg office" />);
    const tile = screen.getByTestId('place-tile', HIDDEN);
    const tints = [lightColors.tealTint, lightColors.amberTint, lightColors.indigoTint];
    expect(tints).toContain(StyleSheet.flatten(tile.props.style).backgroundColor);
    // No letter any more.
    expect(screen.queryByText('G', HIDDEN)).toBeNull();
  });

  it('gives the same place the same color every time', async () => {
    const colorOf = async (label: string) => {
      const view = await render(<PlaceTile label={label} />);
      const color = StyleSheet.flatten(
        screen.getByTestId('place-tile', HIDDEN).props.style,
      ).backgroundColor;
      await view.unmount();
      return color;
    };
    expect(await colorOf('Clinic')).toBe(await colorOf(' clinic '));
  });

  it('keeps the drawn icons for home and shop, by any of their names', async () => {
    for (const label of ['Home', 'house', 'Shop', 'Market']) {
      const view = await render(<PlaceTile label={label} />);
      expect(screen.queryByTestId('place-tile', HIDDEN)).toBeNull();
      await view.unmount();
    }
  });
});
