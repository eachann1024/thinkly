export const OUTLINE_ACTIVE_ANCHOR_OFFSET = 24;
const OUTLINE_RECOGNITION_MAX_OFFSET = 220;
const OUTLINE_RECOGNITION_VIEWPORT_RATIO = 0.28;

/** Heading anchors follow document order. Probe live positions to handle reflow. */
export function findActiveHeadingIndex(
  count: number,
  getY: (index: number) => number,
  candidates: ReadonlySet<number>,
  viewportHeight: number,
  isNearBottom: boolean,
): number | null {
  let firstCandidate = count;
  let lastCandidate = -1;
  for (const index of candidates) {
    firstCandidate = Math.min(firstCandidate, index);
    lastCandidate = Math.max(lastCandidate, index);
  }

  const boundary = (y: number, inclusive: boolean) => {
    let low = 0;
    let high = count;
    const isBefore = (index: number) =>
      inclusive ? getY(index) <= y : getY(index) < y;
    // Observer candidates narrow the search; live probes also handle scroll jumps
    // before the observer has delivered its next batch.
    for (const index of [firstCandidate, lastCandidate]) {
      if (index < 0 || index >= count) continue;
      if (isBefore(index)) low = Math.max(low, index + 1);
      else high = Math.min(high, index);
    }
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (isBefore(middle)) low = middle + 1;
      else high = middle;
    }
    return low;
  };

  if (isNearBottom) {
    const lastVisible = boundary(viewportHeight, false) - 1;
    if (lastVisible >= 0) return lastVisible;
  }
  const upcoming = boundary(OUTLINE_ACTIVE_ANCHOR_OFFSET, true);
  const passedY = upcoming > 0 ? getY(upcoming - 1) : -Infinity;
  const recognitionOffset = Math.min(
    OUTLINE_RECOGNITION_MAX_OFFSET,
    Math.max(
      OUTLINE_ACTIVE_ANCHOR_OFFSET,
      viewportHeight * OUTLINE_RECOGNITION_VIEWPORT_RATIO,
    ),
  );
  if (
    upcoming < count &&
    (upcoming === 0 || (passedY < 0 && getY(upcoming) <= recognitionOffset))
  ) {
    return upcoming;
  }
  // Preserve the first heading when several anchors share the same position.
  return upcoming > 0 ? boundary(passedY, false) : null;
}
