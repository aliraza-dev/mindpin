// The bottom bar shows which screen is open (R6.5).
import { render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';

import { TabIcon } from './TabIcon';
import { lightColors } from './tokens';

const background = () =>
  StyleSheet.flatten(screen.getByTestId('tab-navHome').props.style).backgroundColor;

describe('TabIcon', () => {
  it('puts the open tab on a tinted pill in the accent color', async () => {
    await render(<TabIcon icon="navHome" active />);
    expect(background()).toBe(lightColors.tealSoft);
    expect(JSON.stringify(screen.toJSON())).toContain(
      `"tintColor":${String(processColor(lightColors.accent))}`,
    );
  });

  it('leaves the other tabs plain and muted', async () => {
    await render(<TabIcon icon="navHome" active={false} />);
    expect(background()).toBeUndefined();
    expect(JSON.stringify(screen.toJSON())).toContain(
      `"tintColor":${String(processColor(lightColors.mutedText))}`,
    );
  });
});
