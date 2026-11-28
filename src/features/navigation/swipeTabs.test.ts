// Swiping between tabs (R6.5).
import { isTabSwipe, tabAfterSwipe } from './swipeTabs';

const drag = (dx: number, vx = 0, dy = 0) => ({ dx, dy, vx });

describe('swiping between tabs', () => {
  it('moves to the next tab on a swipe to the left and back on a swipe to the right', () => {
    expect(tabAfterSwipe(0, 3, drag(-120))).toBe(1);
    expect(tabAfterSwipe(1, 3, drag(-120))).toBe(2);
    expect(tabAfterSwipe(1, 3, drag(120))).toBe(0);
  });

  it('stays put at either end of the row', () => {
    expect(tabAfterSwipe(0, 3, drag(120))).toBe(0);
    expect(tabAfterSwipe(2, 3, drag(-120))).toBe(2);
  });

  it('ignores a small drag but accepts a quick flick', () => {
    expect(tabAfterSwipe(0, 3, drag(-40))).toBe(0);
    expect(tabAfterSwipe(0, 3, drag(-40, -0.8))).toBe(1);
    expect(tabAfterSwipe(0, 3, drag(-10, -2))).toBe(0);
  });

  it('mirrors the directions in a right-to-left layout', () => {
    expect(tabAfterSwipe(0, 3, drag(120), true)).toBe(1);
    expect(tabAfterSwipe(1, 3, drag(-120), true)).toBe(0);
  });

  it('only treats a clearly sideways drag as a swipe, so lists still scroll', () => {
    expect(isTabSwipe(drag(-60, 0, 10))).toBe(true);
    expect(isTabSwipe(drag(-60, 0, 50))).toBe(false);
    expect(isTabSwipe(drag(-10))).toBe(false);
  });
});
