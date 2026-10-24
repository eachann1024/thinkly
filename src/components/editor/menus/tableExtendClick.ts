export const TABLE_EXTEND_CLICK_SLOP_PX = 4;

export function isTableExtendPointerClick(
  movementPx: number,
  slopPx = TABLE_EXTEND_CLICK_SLOP_PX,
) {
  return Math.abs(movementPx) < slopPx;
}
