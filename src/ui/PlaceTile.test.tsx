// The round icon beside a place (R6.3).
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PlaceTile } from './PlaceTile';
import { lightColors, tokens } from './tokens';

const HIDDEN = { includeHiddenElements: true };
const tile = () => StyleSheet.flatten(screen.getByTestId('place-tile', HIDDEN).props.style);

describe('PlaceTile', () => {
  it('shows a map pin on the theme color for a place with no icon of its own', async () => {
    await render(<PlaceTile label="Gulberg office" />);
    expect(tile().backgroundColor).toBe(lightColors.accent);
    // No letter any more.
    expect(screen.queryByText('G', HIDDEN)).toBeNull();
  });

  it('is a circle for every place, like the circle of a person', async () => {
    for (const label of ['Home', 'house', 'Shop', 'Market', 'Clinic']) {
      const view = await render(<PlaceTile label={label} />);
      expect(tile()).toMatchObject({
        width: tokens.size.tile,
        borderRadius: tokens.size.tile / 2,
        overflow: 'hidden',
      });
      await view.unmount();
    }
  });
});
