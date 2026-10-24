export const PROMPT_BAR_RADIUS = 8;

export function promptBarBeamRadius({
  width,
  height,
  inset = 1,
  radius = PROMPT_BAR_RADIUS,
}: {
  width: number;
  height: number;
  inset?: number;
  radius?: number;
}): number {
  const innerW = Math.max(0, width - inset * 2);
  const innerH = Math.max(0, height - inset * 2);
  const maxCorner = Math.min(innerW, innerH) / 2;
  return Math.min(maxCorner, Math.max(0, radius - inset));
}
