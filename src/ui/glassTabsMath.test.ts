// The glass bubble's positions (R6.3, R6.5).
import { bubbleLeft, clampBubble, stretchFor, tabUnderBubble } from './glassTabsMath';

describe('glass tabs', () => {
  it('puts the bubble under the open tab, mirrored in a right-to-left layout', () => {
    expect(bubbleLeft(0, 3, 100)).toBe(0);
    expect(bubbleLeft(2, 3, 100)).toBe(200);
    expect(bubbleLeft(0, 3, 100, true)).toBe(200);
  });

  it('keeps a dragged bubble inside the row', () => {
    expect(clampBubble(-40, 3, 100)).toBe(0);
    expect(clampBubble(150, 3, 100)).toBe(150);
    expect(clampBubble(900, 3, 100)).toBe(200);
  });

  it('ends a drag on the tab the bubble is mostly over', () => {
    expect(tabUnderBubble(40, 3, 100)).toBe(0);
    expect(tabUnderBubble(60, 3, 100)).toBe(1);
    expect(tabUnderBubble(500, 3, 100)).toBe(2);
    expect(tabUnderBubble(40, 3, 100, true)).toBe(2);
    expect(tabUnderBubble(40, 3, 0)).toBe(0);
  });

  it('stretches the bubble a little with speed, up to a quarter', () => {
    expect(stretchFor(0)).toBe(1);
    expect(stretchFor(1)).toBeCloseTo(1.12);
    expect(stretchFor(-1)).toBeCloseTo(1.12);
    expect(stretchFor(10)).toBe(1.25);
  });
});
