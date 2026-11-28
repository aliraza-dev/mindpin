// Where the glass bubble of a row of tabs sits, and which tab a drag ends on. Pure: the
// component feeds it measurements and gets back positions.

// The left edge of the bubble for a tab. In a right-to-left layout the first tab is at the
// right, so the positions are mirrored.
export function bubbleLeft(index: number, count: number, slot: number, rtl = false): number {
  return (rtl ? count - 1 - index : index) * slot;
}

// Keeps a dragged bubble inside the row.
export function clampBubble(left: number, count: number, slot: number): number {
  return Math.max(0, Math.min((count - 1) * slot, left));
}

// The tab the bubble is over when the finger lifts.
export function tabUnderBubble(left: number, count: number, slot: number, rtl = false): number {
  if (slot <= 0) return 0;
  const position = Math.round(clampBubble(left, count, slot) / slot);
  return rtl ? count - 1 - position : position;
}

// How much the bubble stretches sideways for how fast it is being dragged: a little, like a
// drop of water, and never more than a quarter wider.
export function stretchFor(velocity: number): number {
  return 1 + Math.min(0.25, Math.abs(velocity) * 0.12);
}
