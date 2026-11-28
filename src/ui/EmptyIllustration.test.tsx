// T147: the moving picture on an empty screen (R11.4, R11.5).
import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { EmptyIllustration, type EmptyKind } from './EmptyIllustration';

const HIDDEN = { includeHiddenElements: true };

describe('EmptyIllustration', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each<EmptyKind>(['places', 'notes', 'search'])(
    'draws the %s picture and hides it from screen readers',
    async (kind) => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      await render(<EmptyIllustration kind={kind} />);
      const picture = screen.getByTestId(`empty-${kind}`, HIDDEN);
      expect(picture.props.accessible).toBe(false);
      expect(picture.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(screen.queryByTestId(`empty-${kind}`)).toBeNull();
    },
  );

  it('moves, and stops when it leaves the screen', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const stop = jest.fn();
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn(),
      stop,
      reset: jest.fn(),
    });
    const view = await render(<EmptyIllustration kind="places" />);
    await waitFor(() => expect(loop).toHaveBeenCalledTimes(1));
    await view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stays still when the phone is set to reduce motion (R11.5)', async () => {
    const reduced = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const loop = jest.spyOn(Animated, 'loop');
    await render(<EmptyIllustration kind="notes" />);
    await waitFor(() => expect(reduced).toHaveBeenCalled());
    expect(loop).not.toHaveBeenCalled();
  });
});
