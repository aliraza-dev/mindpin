// Swiping sideways on Home moves between its People and Places lists (owner request,
// 2026-11-28). Pure: the screen feeds it the drag and gets back the list to show.

// A drag must cover this much of the screen's width, or be a quick flick, to count.
const DISTANCE = 64;
const FLICK = 0.5;

export type Drag = { dx: number; dy: number; vx: number };

// True when a drag has gone far enough sideways, and is clearly sideways, to be a swipe
// between tabs rather than a scroll or a tap.
export function isTabSwipe({ dx, dy }: Drag): boolean {
  return Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 2;
}

// The tab to show after the finger lifts: the next one for a swipe towards the start of the
// row, the one before for a swipe towards the end, or the same one when the drag was too small
// or there is no tab that way. In a right-to-left layout the directions are mirrored.
export function tabAfterSwipe(current: number, count: number, drag: Drag, rtl = false): number {
  const far = Math.abs(drag.dx) >= DISTANCE;
  const quick = Math.abs(drag.vx) >= FLICK && Math.abs(drag.dx) > 24;
  if (!far && !quick) return current;
  const forward = rtl ? drag.dx > 0 : drag.dx < 0;
  const next = current + (forward ? 1 : -1);
  return next < 0 || next >= count ? current : next;
}
